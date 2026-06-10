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
