# -*- coding: utf-8 -*-
"""
Генератор статичних сторінок для кожного вірша/оповідання
з poeziya.json та proza.json — для SEO та коректних
прев'ю у соцмережах.

Запуск: python3 generate_static_pages.py
Очікує poeziya.json, proza.json в тій самій папці.
Створює:
  /poeziya/<slug>.html   — по одному файлу на вірш
  /proza/<slug>.html     — по одному файлу на оповідання
  /sitemap.xml           — карта сайту з усіма сторінками
"""

import json
import html
import os
import re
import sys
from collections import Counter

SITE_URL = "https://poetessa.netlify.app"
SITE_NAME = "Юлія Забіяка"

# Дата, якою підписуються сторінки, якщо в самому елементі
# немає власного поля "updated". НЕ підставляйте сюди date.today() —
# інакше lastmod у sitemap.xml буде "оновлюватися" при кожному
# деплої, навіть якщо текст не змінювався, і Google перестане
# довіряти цьому полю. Змінюйте цю дату вручну, коли справді
# зроблено масові правки текстів.
FALLBACK_LASTMOD = "2026-09-04"

# Картинка за замовчуванням для og:image / twitter:image, якщо в
# елементі немає власного поля "image". Один спільний файл — краще,
# ніж жодного; за бажання можна завести окремі картинки на категорію
# нижче в CATEGORY_IMAGES.
DEFAULT_IMAGE = f"{SITE_URL}/image/p2.jpg"

CATEGORY_IMAGES = {
    # "dytiacha": f"{SITE_URL}/image/dytiacha-cover.jpg",
    # "liryka": f"{SITE_URL}/image/liryka-cover.jpg",
    # "hrystyianska": f"{SITE_URL}/image/hrystyianska-cover.jpg",
}

POEM_CATEGORY_LABELS = {
    "dytiacha": "Для дітей",
    "liryka": "Лірика для дорослих",
    "hrystyianska": "Християнська поезія",
}

PROSE_CATEGORY_LABELS = {
    "other": "Проза",
    "opovidannya": "Оповідання",
    "novel": "Роман",
    "essay": "Есе",
    "kazka": "Казка",
    "dytiacha": "Для дітей",
}


def esc(s):
    return html.escape(str(s or ""), quote=True)


def make_description(item):
    if item.get("description"):
        base = item["description"]
    else:
        base = re.sub(r"\s+", " ", item["text"]).strip()
    if len(base) > 155:
        base = base[:155].rsplit(" ", 1)[0] + "…"
    return base


def text_to_html(text, as_poem):
    # Абзаци розділені порожнім рядком (\n\n). Але частина текстів у
    # проза.json/поезія.json ще має лише одинарні \n між рядками —
    # без цієї заміни такі тексти злипались би в суцільний блок без
    # жодного розриву (браузер ігнорує одиночні \n у HTML). Тому
    # одиночні \n всередині абзацу теж перетворюємо на <br> — і для
    # віршів, і для прози: для текстів з правильними \n\n це нічого
    # не змінює (рядок і так один), а для "старих" текстів з
    # одиночними \n рядки нарешті розриваються як слід.
    paragraphs = re.split(r"\n\s*\n", text.strip())
    out = []
    for p in paragraphs:
        lines = p.split("\n")
        out.append("<p>" + "<br>\n".join(esc(l) for l in lines) + "</p>")
    return "\n\n        ".join(out)


HEADER_TEMPLATE = """<!DOCTYPE html>
<html lang="uk">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">

  <title>{title} — {site_name}</title>
  <meta name="description" content="{description}">

  <link rel="canonical" href="{canonical}">

  <meta property="og:type" content="article">
  <meta property="og:title" content="{title} — {site_name}">
  <meta property="og:description" content="{description}">
  <meta property="og:url" content="{canonical}">
  <meta property="og:site_name" content="{site_name}">
  <meta property="og:locale" content="uk_UA">
  <meta property="og:image" content="{image}">
  <meta property="og:image:alt" content="{title} — {site_name}">

  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="{title} — {site_name}">
  <meta name="twitter:description" content="{description}">
  <meta name="twitter:image" content="{image}">

  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link
    href="https://fonts.googleapis.com/css2?family=Literata:opsz,wght@7..72,400;7..72,500;7..72,600;7..72,700&family=Caveat:wght@500;600;700&family=PT+Sans:wght@400;700&display=swap"
    rel="stylesheet"
  >

  <link rel="stylesheet" href="/style.css">

  <script type="application/ld+json">
  {jsonld}
  </script>
</head>

<body>

<header class="site-header">
  <div class="wrap nav-row">
    <a class="brand" href="/index.html">
      <span class="brand-name">Юлія Забіяка</span>
      <small>Поетеса · Письменниця · Християнка</small>
    </a>

    <button id="navToggle" class="nav-toggle" type="button" aria-label="Відкрити меню" aria-expanded="false" aria-controls="mainNav">
      <span></span><span></span><span></span>
    </button>

    <div class="nav-area">
      <nav id="mainNav" class="main-nav" aria-label="Головна навігація">
        <ul>
          <li><a href="/index.html">Головна</a></li>
          <li><a href="/pro-mene.html">Про мене</a></li>
          <li><a href="/poeziya.html"{poeziya_active}>Поезія</a></li>
          <li><a href="/proza.html"{proza_active}>Проза</a></li>
          <li><a href="/video.html">Відео</a></li>
          <li><a href="/knygy.html">Книги</a></li>
          <li><a href="/kontakty.html">Контакти</a></li>
        </ul>
      </nav>

      <button id="themeToggle" class="theme-toggle" type="button" title="Змінити тему" aria-label="Змінити тему">
        <span class="theme-icon theme-icon-light">☀</span>
        <span class="theme-icon theme-icon-dark">☾</span>
      </button>
    </div>
  </div>
</header>


<main>

<section class="wrap page-hero">

  {series_html}

  <h1>{title}</h1>

  {subtitle_html}

  <p class="poem-eyebrow">{category_label}</p>

  <div class="poem-modal-text" style="margin: 30px 0;">
        {body_html}
  </div>

  {description_html}

  {tags_block_html}

</section>

</main>


<footer>
  <div class="wrap">
    <p class="footer-quote">«Нехай слова знаходять шлях до серця.»</p>

    <div class="footer-row">
      <div>
        <nav class="footer-nav" aria-label="Навігація у підвалі">
          <ul>
            <li><a href="/index.html">Головна</a></li>
            <li><a href="/pro-mene.html">Про мене</a></li>
            <li><a href="/poeziya.html">Поезія</a></li>
            <li><a href="/proza.html">Проза</a></li>
            <li><a href="/video.html">Відео</a></li>
            <li><a href="/knygy.html">Книги</a></li>
            <li><a href="/kontakty.html">Контакти</a></li>
          </ul>
        </nav>
        <p class="footer-fine">© {site_name}. Пишу серцем · Живу вірою · Люблю Україну</p>
      </div>

      <div class="footer-social">
        <a href="https://www.facebook.com/ulia.zabiaka/directory_work" target="_blank" rel="noopener noreferrer">Facebook</a>
        <a href="https://www.instagram.com/iuliiaenei" target="_blank" rel="noopener noreferrer">Instagram</a>
      </div>
    </div>
  </div>
</footer>

<button id="toTop" title="Нагору" aria-label="Прокрутити нагору" type="button">↑</button>

<script src="/script.js"></script>

</body>
</html>
"""


def build_page(item, kind):
    is_poem = kind == "poeziya"
    title = item["title"]
    slug = item["id"]
    category_label = (
        POEM_CATEGORY_LABELS.get(item.get("category"), "Поезія")
        if is_poem
        else PROSE_CATEGORY_LABELS.get(item.get("category"), "Проза")
    )
    description = make_description(item)
    canonical = f"{SITE_URL}/{kind}/{slug}.html"
    back_href = f"/{kind}.html"
    back_label = "Уся поезія" if is_poem else "Уся проза"
    image = item.get("image") or CATEGORY_IMAGES.get(item.get("category")) or DEFAULT_IMAGE

    series_html = ""
    if item.get("series"):
        series_html = f'<p class="prose-card-series" style="margin-top:20px;">Серія: {esc(item["series"])}</p>'

    subtitle_html = ""
    if item.get("subtitle"):
        subtitle_html = f'<p class="prose-card-subtitle" style="margin-bottom:20px;">{esc(item["subtitle"])}</p>'

    description_html = ""
    if item.get("description"):
        css_class = "poem-modal-description" if is_poem else "prose-card-description"
        description_html = f'<p class="{css_class}">{esc(item["description"])}</p>'

    tags = item.get("tags", [])
    tags_html = "\n    ".join(
        f'<a class="tag" href="/{kind}?tag={esc(tag)}">#{esc(tag)}</a>' for tag in tags
    )

    tags_block_html = ""
    if tags:
        tags_block_html = f'''<div style="margin-top:28px;">
    <div class="related-by-tag-head">
      <p class="related-by-tag-title">Читати більше за темою:</p>
      <a class="related-by-tag-all-link" href="{back_href}">{back_label} →</a>
    </div>
    <div class="poem-tags">
      {tags_html}
    </div>
  </div>'''
    else:
        # Немає тегів — все одно лишаємо шлях назад до списку,
        # просто без заголовка "Читати більше за темою" й хмари тегів.
        tags_block_html = f'''<div style="margin-top:28px;">
    <a class="related-by-tag-all-link" href="{back_href}">{back_label} →</a>
  </div>'''

    body_html = text_to_html(item["text"], as_poem=is_poem)

    ld = {
        "@context": "https://schema.org",
        "@type": "CreativeWork",
        "name": title,
        "author": {"@type": "Person", "name": SITE_NAME},
        "inLanguage": "uk",
        "description": description,
        "url": canonical,
    }
    if item.get("series"):
        # schema.org isPartOf очікує обʼєкт (CreativeWorkSeries) або URL,
        # а не голий рядок — інакше валідатор structured data це не зарахує.
        ld["isPartOf"] = {"@type": "CreativeWorkSeries", "name": item["series"]}
    ld["image"] = image

    html_out = HEADER_TEMPLATE.format(
        title=esc(title),
        site_name=SITE_NAME,
        description=esc(description),
        canonical=canonical,
        image=esc(image),
        jsonld=json.dumps(ld, ensure_ascii=False, indent=2),
        poeziya_active=' class="active"' if is_poem else "",
        proza_active=' class="active"' if not is_poem else "",
        back_href=back_href,
        back_label=back_label,
        series_html=series_html,
        subtitle_html=subtitle_html,
        category_label=esc(category_label),
        body_html=body_html,
        description_html=description_html,
        tags_block_html=tags_block_html,
    )
    return html_out


def check_unique_ids(items, filename):
    ids = [it["id"] for it in items]
    dupes = [id_ for id_, count in Counter(ids).items() if count > 1]
    if dupes:
        print(f"ПОМИЛКА: у {filename} дублюються id: {dupes}", file=sys.stderr)
        print("Виправте дублі перед генерацією — інакше один файл", file=sys.stderr)
        print("мовчки перезапише інший.", file=sys.stderr)
        sys.exit(1)


def main():
    poems = json.load(open("poeziya.json", encoding="utf-8"))
    prose = json.load(open("proza.json", encoding="utf-8"))

    check_unique_ids(poems, "poeziya.json")
    check_unique_ids(prose, "proza.json")

    os.makedirs("poeziya", exist_ok=True)
    os.makedirs("proza", exist_ok=True)

    sitemap_urls = []

    for page in ["index.html", "pro-mene.html", "poeziya.html", "proza.html", "video.html", "knygy.html", "kontakty.html"]:
        sitemap_urls.append((f"{SITE_URL}/{page}", FALLBACK_LASTMOD, "0.8"))

    for item in poems:
        html_out = build_page(item, "poeziya")
        path = os.path.join("poeziya", f"{item['id']}.html")
        with open(path, "w", encoding="utf-8") as f:
            f.write(html_out)
        lastmod = item.get("updated", FALLBACK_LASTMOD)
        sitemap_urls.append((f"{SITE_URL}/poeziya/{item['id']}.html", lastmod, "0.6"))

    for item in prose:
        html_out = build_page(item, "proza")
        path = os.path.join("proza", f"{item['id']}.html")
        with open(path, "w", encoding="utf-8") as f:
            f.write(html_out)
        lastmod = item.get("updated", FALLBACK_LASTMOD)
        sitemap_urls.append((f"{SITE_URL}/proza/{item['id']}.html", lastmod, "0.6"))

    sitemap_lines = ['<?xml version="1.0" encoding="UTF-8"?>',
                      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">']
    for url, lastmod, priority in sitemap_urls:
        sitemap_lines.append(
            f"  <url>\n    <loc>{html.escape(url)}</loc>\n    <lastmod>{lastmod}</lastmod>\n    <priority>{priority}</priority>\n  </url>"
        )
    sitemap_lines.append("</urlset>")

    with open("sitemap.xml", "w", encoding="utf-8") as f:
        f.write("\n".join(sitemap_lines))

    print(f"Generated {len(poems)} poem pages, {len(prose)} prose pages.")
    print(f"sitemap.xml with {len(sitemap_urls)} URLs.")


if __name__ == "__main__":
    main()
