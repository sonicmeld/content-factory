import uuid
from sqlalchemy.orm import Session
from datetime import datetime
from typing import Optional, List, Dict, Any, Tuple
import json

from database.models import ChannelPromptAssignment, PromptContext, RuntimeAudit, Channel, ContentPackage

# ---------------------------------------------------------
# 1. Prompt Resolver
# ---------------------------------------------------------
def resolve_assigned_prompts(db: Session, channel_id: str, prompt_type: str) -> List[PromptContext]:
    """
    Fetch all active assigned prompts for a channel and type, sorted by assignment_order.
    """
    assignments = (
        db.query(ChannelPromptAssignment)
        .filter(
            ChannelPromptAssignment.channel_id == channel_id,
            ChannelPromptAssignment.is_active == 1
        )
        .order_by(ChannelPromptAssignment.assignment_order.asc())
        .all()
    )
    
    prompt_ids = [a.prompt_id for a in assignments]
    if not prompt_ids:
        return []
        
    prompts = (
        db.query(PromptContext)
        .filter(
            PromptContext.id.in_(prompt_ids),
            PromptContext.prompt_type == prompt_type,
            PromptContext.is_active == 1
        )
        .all()
    )
    
    # Re-sort to match assignment_order
    prompt_map = {p.id: p for p in prompts}
    ordered_prompts = [prompt_map[pid] for pid in prompt_ids if pid in prompt_map]
    return ordered_prompts

def resolve_prompt_chain(db: Session, selected_context_id: Optional[str], channel_id: str, prompt_type: str) -> Tuple[Optional[PromptContext], List[PromptContext]]:
    """
    Resolves the Selected Prompt and the Assigned Prompts.
    """
    selected_prompt = None
    if selected_context_id:
        selected_prompt = db.query(PromptContext).filter(PromptContext.id == selected_context_id).first()
        if selected_prompt and selected_prompt.channel_id != channel_id:
            raise ValueError("Prompt Context does not belong to Package Channel")
        
    assigned_prompts = resolve_assigned_prompts(db, channel_id, prompt_type)
    return selected_prompt, assigned_prompts


# ---------------------------------------------------------
# 2. Prompt Composition Engine
# ---------------------------------------------------------
def build_prompt_chain_text(selected_prompt: Optional[PromptContext], assigned_prompts: List[PromptContext]) -> str:
    """
    Basic Composition Engine: Concat Selected + Assigned #1 + Assigned #N
    """
    chain_parts = []
    
    if selected_prompt:
        chain_parts.append(f"=== {selected_prompt.title.upper()} ===")
        if selected_prompt.topic: chain_parts.append(f"Topic: {selected_prompt.topic}")
        if selected_prompt.keywords: chain_parts.append(f"Keywords: {selected_prompt.keywords}")
        if selected_prompt.notes: chain_parts.append(f"Notes: {selected_prompt.notes}")
        if selected_prompt.description: chain_parts.append(f"Description: {selected_prompt.description}")
        
    for idx, prompt in enumerate(assigned_prompts, start=1):
        chain_parts.append(f"\n=== RULE {idx}: {prompt.title.upper()} ===")
        if prompt.topic: chain_parts.append(f"Topic: {prompt.topic}")
        if prompt.keywords: chain_parts.append(f"Keywords: {prompt.keywords}")
        if prompt.notes: chain_parts.append(f"Notes: {prompt.notes}")
        if prompt.description: chain_parts.append(f"Description: {prompt.description}")
        
    return "\n".join(chain_parts)


# ---------------------------------------------------------
# 3. Runtime Context Builder
# ---------------------------------------------------------
def build_runtime_payload(prompt_chain_text: str, channel: Channel, package: ContentPackage, timestamp_content: str, is_metadata: bool = True) -> str:
    """
    Builds the final payload merging prompt chain with contextual data.
    """
    video_filename = package.video_path.split("/")[-1].split("\\")[-1] if package.video_path else "unknown"
    
    payload = "=== PACKAGE INFORMATION ===\n"
    payload += f"Channel: {channel.name}\n"
    payload += f"Package Number: {package.package_number}\n"
    payload += f"Video File: {video_filename}\n"
    if timestamp_content:
        payload += f"\nTimestamp File Content:\n{timestamp_content}\n"
        
    if prompt_chain_text:
        payload += f"\n{prompt_chain_text}\n"
        
    if not is_metadata:
        payload += "\nGenerate a professional YouTube thumbnail concept based on the above information."
        
    return payload


# ---------------------------------------------------------
# 4. Combo Resolver
# ---------------------------------------------------------
def resolve_combo(combo_string: str) -> str:
    """
    Reads and validates the Combo. Since 9Router handles provider abstraction,
    we simply validate the string isn't empty.
    """
    if not combo_string or not combo_string.strip():
        raise ValueError("Combo string is empty or invalid.")
    return combo_string.strip()


# ---------------------------------------------------------
# 5. Runtime Audit Service
# ---------------------------------------------------------
def create_runtime_audit(
    db: Session, 
    package_id: str, 
    execution_type: str, 
    selected_prompt: Optional[PromptContext], 
    assigned_prompts: List[PromptContext], 
    combo: str,
    prompt_chain_text: str
) -> RuntimeAudit:
    """
    Creates the initial audit record with status 'pending'
    """
    execution_id = str(uuid.uuid4())
    
    assigned_ids = [p.id for p in assigned_prompts]
    assigned_titles = [p.title for p in assigned_prompts]
    
    preview = prompt_chain_text[:1000] if prompt_chain_text else ""
    
    audit = RuntimeAudit(
        id=str(uuid.uuid4()),
        execution_id=execution_id,
        package_id=package_id,
        execution_type=execution_type,
        selected_prompt_id=selected_prompt.id if selected_prompt else None,
        selected_prompt_title=selected_prompt.title if selected_prompt else None,
        assigned_prompt_ids=json.dumps(assigned_ids),
        assigned_prompt_titles=json.dumps(assigned_titles),
        prompt_preview=preview,
        combo_used=combo,
        status="pending",
        error_message=None,
        executed_at=datetime.utcnow()
    )
    
    db.add(audit)
    db.commit()
    db.refresh(audit)
    return audit

def finalize_runtime_audit(db: Session, execution_id: str, success: bool, error_message: Optional[str] = None):
    """
    Updates the status to success or failed.
    """
    audit = db.query(RuntimeAudit).filter(RuntimeAudit.execution_id == execution_id).first()
    if audit:
        audit.status = "success" if success else "failed"
        if error_message:
            # Sanitize by just storing the message text, no stack traces
            audit.error_message = error_message[:1000] # Cap just in case
        db.commit()


# ---------------------------------------------------------
# 6. Global 9Router Payload Sanitizer & Safeguards
# ---------------------------------------------------------
def sanitize_9router_payload(db: Session, payload: dict) -> Tuple[dict, int]:
    """
    Sanitize 9Router payload dynamically based on System Settings:
    - Strips response_format if nine_router_strip_json_mode is enabled and it is a non-gpt model.
    - Strips presence/frequency penalties if nine_router_strip_penalties is enabled and it is a non-gpt model.
    - Limits max_tokens to nine_router_max_tokens.
    - Converts system messages to user messages if nine_router_convert_system_to_user is enabled.
    Returns: (sanitized_payload, timeout_seconds)
    """
    from database.models import SystemSetting

    model_name = payload.get("model", "").lower()
    is_gpt = "gpt-" in model_name or "text-davinci" in model_name
    
    # Load settings from database
    strip_json = db.query(SystemSetting).filter(SystemSetting.key == "nine_router_strip_json_mode").first()
    strip_penalties = db.query(SystemSetting).filter(SystemSetting.key == "nine_router_strip_penalties").first()
    convert_system = db.query(SystemSetting).filter(SystemSetting.key == "nine_router_convert_system_to_user").first()
    max_tokens_val = db.query(SystemSetting).filter(SystemSetting.key == "nine_router_max_tokens").first()
    timeout_val = db.query(SystemSetting).filter(SystemSetting.key == "nine_router_timeout").first()

    # Parse settings with defaults
    should_strip_json = (strip_json.value == "1") if strip_json else True
    should_strip_penalties = (strip_penalties.value == "1") if strip_penalties else True
    should_convert_system = (convert_system.value == "1") if convert_system else False
    max_tokens_cap = int(max_tokens_val.value) if (max_tokens_val and max_tokens_val.value.isdigit()) else 4000
    timeout_sec = int(timeout_val.value) if (timeout_val and timeout_val.value.isdigit()) else 60

    # 1. Clean JSON Mode
    if should_strip_json and not is_gpt:
        payload.pop("response_format", None)

    # 2. Clean Penalties
    if should_strip_penalties and not is_gpt:
        payload.pop("presence_penalty", None)
        payload.pop("frequency_penalty", None)

    # 3. Cap max_tokens if present in payload or add a fallback
    if "max_tokens" in payload:
        if payload["max_tokens"] > max_tokens_cap:
            payload["max_tokens"] = max_tokens_cap
    else:
        payload["max_tokens"] = max_tokens_cap

    # 4. Convert System to User message if requested
    if should_convert_system and "messages" in payload:
        messages = payload["messages"]
        new_messages = []
        system_content = []
        for msg in messages:
            if msg.get("role") == "system":
                system_content.append(msg.get("content", ""))
            else:
                new_messages.append(msg)
        
        if system_content and new_messages:
            system_prefix = "\n".join(system_content)
            # Prepend system content to the first user message
            user_found = False
            for msg in new_messages:
                if msg.get("role") == "user":
                    msg["content"] = f"[System Instructions]\n{system_prefix}\n\n[User Input]\n{msg.get('content', '')}"
                    user_found = True
                    break
            if not user_found:
                new_messages.insert(0, {"role": "user", "content": system_prefix})
            payload["messages"] = new_messages

    return payload, timeout_sec
