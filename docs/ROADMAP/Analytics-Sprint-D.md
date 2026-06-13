# Roadmap — Analytics Sprint D: Market Intelligence & Topic Discovery (Official Revised)

Sprint D berfokus sepenuhnya pada analisis pasar konten berdurasi panjang (**YouTube Long-form Content Market**) untuk mengidentifikasi tren topik baru dan merekomendasikan peluang topik pertumbuhan (**Topic Opportunity**).

---

## 1. Fokus Analisis & Sumber Data
Analisis Sprint D didasarkan sepenuhnya pada metrik pasar long-form:
*   **Google Trends**: Mengukur volume pencarian dan ketertarikan historis terhadap kata kunci tertentu.
*   **YouTube Search Demand**: Mengukur intensitas pencarian kata kunci pada mesin pencari YouTube.
*   **YouTube Suggest**: Mengidentifikasi pelengkapan kata kunci otomatis (autocomplete suggestions) untuk menangkap minat audiens real-time.
*   **Observed Competitors**: Memetakan topik yang sedang gencar dirilis oleh competitor channels.
*   **Observed Topics**: Mengelompokkan tren performa topik (views velocity & retention) pada database workspace.
*   **Observed Publishing Patterns**: Mempelajari pola publikasi industri sejenis.

---

## 2. Output Utama: Topic Opportunity
Hasil akhir analisis pasar bukan merupakan video viral, melainkan **Topic Opportunity** yang memiliki tingkat kompetisi rendah namun memiliki minat (demand) yang tinggi. 

Contoh topik yang ditargetkan:
*   *AI Agents*
*   *Model Context Protocol (MCP)*
*   *Open Source Automation*
*   *Local AI*
*   *n8n Workflows*
*   *Content Automation*

Setiap peluang topik yang ditemukan akan dikuantifikasi ke dalam bentuk skor terstruktur.

---

## 3. Integrasi ke Sprint E (Context Package)
Output dari **Market Intelligence Engine** pada Sprint D dirancang untuk langsung disuntikkan sebagai parameter masukan bagi **Context Package Engine** (Sprint E) tanpa memerlukan migrasi besar:

```json
{
  "topic": "AI Agents",
  "market_score": 91,
  "competition_score": 32,
  "forecast_score": 84,
  "opportunity_score": 90
}
```

---

## 4. Governance & Batasan Arsitektur

> [!IMPORTANT]
> **Non-Goals (Batasan Cakupan)**
>
> Sprint D **TIDAK** mendukung atau menganalisis:
> *   YouTube Shorts analytics
> *   TikTok analytics
> *   Instagram Reels analytics
> *   Facebook Reels analytics
> *   Pelacakan konten viral berdurasi pendek (short-form viral tracking)
>
> Cakupan platform dibatasi secara eksklusif hanya untuk **YouTube Long-form Content** guna menjaga fokus domain analitik tetap bersih dan selaras dengan pipeline produksi Content Factory.
