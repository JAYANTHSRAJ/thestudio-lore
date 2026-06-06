import os
import re
import json
import requests
from bs4 import BeautifulSoup
from urllib.parse import urlparse, urljoin, unquote

# Base Configuration
ROOT_DIR = r"D:\studio\local_site"
CRAWL_FILE = r"D:\studio\crawl_results.json"
DOMAIN = "thestudiolore.com"

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
}

# Regex for CSS url() and @import
CSS_URL_PATTERN = re.compile(r'url\(\s*[\'"]?([^\'")\?#]+)(?:[?#][^\)]*)?[\'"]?\s*\)')
CSS_IMPORT_PATTERN = re.compile(r'@import\s+url\(\s*[\'"]?([^\'")\?#]+)(?:[?#][^\)]*)?[\'"]?\s*\)')
CSS_IMPORT_STRING_PATTERN = re.compile(r'@import\s+[\'"]([^\'")\?#]+)(?:[?#][^\)]*)?[\'"]')

# Helper to normalize URLs
def normalize_url(url):
    if not url:
        return None
    parsed = urlparse(url)
    if DOMAIN not in parsed.netloc:
        return None
    if 'wp-login' in parsed.path or 'wp-register' in parsed.path or 'action=' in parsed.query:
        return None
    path = parsed.path
    if path.endswith('/'):
        path = path[:-1]
    return f"https://{DOMAIN}{path}"

def get_filename_from_url(url):
    parsed = urlparse(url)
    path = unquote(parsed.path)
    filename = os.path.basename(path)
    if not filename:
        filename = "index.html"
    return filename

def get_unique_local_path(directory, filename):
    name, ext = os.path.splitext(filename)
    # limit filename length to avoid Windows path issues
    if len(name) > 100:
        name = name[:100]
    counter = 1
    local_path = os.path.join(directory, f"{name}{ext}")
    while os.path.exists(local_path):
        local_path = os.path.join(directory, f"{name}_{counter}{ext}")
        counter += 1
    return local_path, os.path.basename(local_path)

def download_file(url, target_dir, filename):
    local_path, saved_name = get_unique_local_path(target_dir, filename)
    try:
        response = requests.get(url, headers=HEADERS, timeout=15)
        if response.status_code == 200:
            with open(local_path, 'wb') as f:
                f.write(response.content)
            return local_path, saved_name
        else:
            print(f"Failed to download {url}: HTTP {response.status_code}")
            return None, filename
    except Exception as e:
        print(f"Error downloading {url}: {e}")
        return None, filename

def get_page_dirs(url):
    parsed = urlparse(url)
    path_parts = [p for p in parsed.path.split('/') if p]
    if not path_parts:
        page_dir = ROOT_DIR
    else:
        page_dir = os.path.join(ROOT_DIR, *path_parts)
    
    assets_dir = os.path.join(page_dir, "assets")
    css_dir = os.path.join(assets_dir, "css")
    js_dir = os.path.join(assets_dir, "js")
    img_dir = os.path.join(assets_dir, "images")
    font_dir = os.path.join(assets_dir, "fonts")
    
    for d in [page_dir, assets_dir, css_dir, js_dir, img_dir, font_dir]:
        os.makedirs(d, exist_ok=True)
        
    return page_dir, css_dir, js_dir, img_dir, font_dir

# Process CSS background-image url() declarations
def process_css_content(css_content, css_url, font_dir, img_dir):
    def replace_url(match):
        original_url = match.group(1).strip()
        if original_url.startswith('data:') or original_url.startswith('http://') or original_url.startswith('https://') or original_url.startswith('//'):
            if original_url.startswith('//'):
                abs_url = 'https:' + original_url
            else:
                abs_url = original_url
        else:
            abs_url = urljoin(css_url, original_url)
            
        parsed_abs = urlparse(abs_url)
        if parsed_abs.netloc and DOMAIN not in parsed_abs.netloc and 'gstatic' not in parsed_abs.netloc and 'googleapis' not in parsed_abs.netloc:
            return match.group(0)

        filename = get_filename_from_url(abs_url)
        ext = os.path.splitext(filename)[1].lower()
        is_font = ext in ['.woff', '.woff2', '.ttf', '.otf', '.eot', '.svg'] and 'font' in abs_url.lower() or ext in ['.woff', '.woff2', '.ttf', '.otf', '.eot']
        
        target_dir = font_dir if is_font else img_dir
        rel_prefix = "../fonts/" if is_font else "../images/"
        
        local_path, saved_name = download_file(abs_url, target_dir, filename)
        if local_path:
            return f"url('{rel_prefix}{saved_name}')"
        return match.group(0)
            
    css_content = CSS_URL_PATTERN.sub(replace_url, css_content)
    return css_content

# Process CSS imports recursively
def process_css_imports(css_content, css_url, css_dir, font_dir, img_dir):
    def replace_import(match):
        import_path = match.group(1).strip()
        if import_path.startswith('data:'):
            return match.group(0)
        abs_url = urljoin(css_url, import_path)
        filename = get_filename_from_url(abs_url)
        if not filename.endswith('.css'):
            filename += '.css'
        
        local_path, saved_name = download_file(abs_url, css_dir, filename)
        if local_path:
            try:
                with open(local_path, 'r', encoding='utf-8', errors='ignore') as f:
                    imported_content = f.read()
                processed_content = process_css_content(imported_content, abs_url, font_dir, img_dir)
                processed_content = process_css_imports(processed_content, abs_url, css_dir, font_dir, img_dir)
                with open(local_path, 'w', encoding='utf-8') as f:
                    f.write(processed_content)
                return f"url('{saved_name}')"
            except Exception as e:
                print(f"Error processing imported CSS {abs_url}: {e}")
                return f"url('{saved_name}')"
        return match.group(0)
        
    css_content = CSS_IMPORT_PATTERN.sub(replace_import, css_content)
    
    def replace_string_import(match):
        import_path = match.group(1).strip()
        if import_path.startswith('data:'):
            return match.group(0)
        abs_url = urljoin(css_url, import_path)
        filename = get_filename_from_url(abs_url)
        if not filename.endswith('.css'):
            filename += '.css'
        local_path, saved_name = download_file(abs_url, css_dir, filename)
        if local_path:
            try:
                with open(local_path, 'r', encoding='utf-8', errors='ignore') as f:
                    imported_content = f.read()
                processed_content = process_css_content(imported_content, abs_url, font_dir, img_dir)
                processed_content = process_css_imports(processed_content, abs_url, css_dir, font_dir, img_dir)
                with open(local_path, 'w', encoding='utf-8') as f:
                    f.write(processed_content)
                return f"@import '{saved_name}'"
            except Exception as e:
                print(f"Error processing string imported CSS {abs_url}: {e}")
                return f"@import '{saved_name}'"
        return match.group(0)
        
    css_content = CSS_IMPORT_STRING_PATTERN.sub(replace_string_import, css_content)
    return css_content

# Rewrite inline styles in HTML
def process_inline_styles(soup, page_url, font_dir, img_dir):
    style_tags = soup.find_all(style=True)
    for tag in style_tags:
        style_content = tag['style']
        def replace_inline_url(match):
            original_url = match.group(1).strip()
            if original_url.startswith('data:'):
                return match.group(0)
            abs_url = urljoin(page_url, original_url)
            filename = get_filename_from_url(abs_url)
            local_path, saved_name = download_file(abs_url, img_dir, filename)
            if local_path:
                return f"url('assets/images/{saved_name}')"
            return match.group(0)
        tag['style'] = CSS_URL_PATTERN.sub(replace_inline_url, style_content)
        
    style_blocks = soup.find_all('style')
    for block in style_blocks:
        if block.string:
            def replace_block_url(match):
                original_url = match.group(1).strip()
                if original_url.startswith('data:'):
                    return match.group(0)
                abs_url = urljoin(page_url, original_url)
                filename = get_filename_from_url(abs_url)
                ext = os.path.splitext(filename)[1].lower()
                is_font = ext in ['.woff', '.woff2', '.ttf', '.otf', '.eot', '.svg'] and 'font' in abs_url.lower() or ext in ['.woff', '.woff2', '.ttf', '.otf', '.eot']
                
                target_dir = font_dir if is_font else img_dir
                rel_prefix = "assets/fonts/" if is_font else "assets/images/"
                
                local_path, saved_name = download_file(abs_url, target_dir, filename)
                if local_path:
                    return f"url('{rel_prefix}{saved_name}')"
                return match.group(0)
            
            block.string = CSS_URL_PATTERN.sub(replace_block_url, block.string)

# Process srcset attributes on tags
def process_html_srcsets(soup, page_url, img_dir):
    tags_with_srcset = soup.find_all(attrs={"srcset": True})
    for tag in tags_with_srcset:
        srcset_val = tag['srcset']
        parts = []
        for part in srcset_val.split(','):
            part = part.strip()
            if not part:
                continue
            subparts = part.split()
            if not subparts:
                continue
            img_url = subparts[0]
            descriptor = " ".join(subparts[1:]) if len(subparts) > 1 else ""
            
            abs_url = urljoin(page_url, img_url)
            filename = get_filename_from_url(abs_url)
            local_path, saved_name = download_file(abs_url, img_dir, filename)
            if local_path:
                rel_path = f"assets/images/{saved_name}"
                if descriptor:
                    parts.append(f"{rel_path} {descriptor}")
                else:
                    parts.append(rel_path)
            else:
                parts.append(part)
        tag['srcset'] = ", ".join(parts)

# Handle WordPress dynamic & lazy-load custom attributes
def process_lazy_load_attributes(soup, page_url, img_dir):
    for tag in soup.find_all(True):
        for attr in list(tag.attrs.keys()):
            if attr.startswith('data-') and isinstance(tag[attr], str):
                val = tag[attr].strip()
                if val.startswith('http://') or val.startswith('https://') or any(val.lower().endswith(ext) for ext in ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp']):
                    if ',' in val and ('w' in val or 'x' in val or '1024w' in val):
                        parts = []
                        for part in val.split(','):
                            part = part.strip()
                            if not part:
                                continue
                            subparts = part.split()
                            if not subparts:
                                continue
                            img_url = subparts[0]
                            descriptor = " ".join(subparts[1:]) if len(subparts) > 1 else ""
                            abs_url = urljoin(page_url, img_url)
                            filename = get_filename_from_url(abs_url)
                            local_path, saved_name = download_file(abs_url, img_dir, filename)
                            if local_path:
                                rel_path = f"assets/images/{saved_name}"
                                if descriptor:
                                    parts.append(f"{rel_path} {descriptor}")
                                else:
                                    parts.append(rel_path)
                            else:
                                parts.append(part)
                        tag[attr] = ", ".join(parts)
                    else:
                        abs_url = urljoin(page_url, val)
                        filename = get_filename_from_url(abs_url)
                        local_path, saved_name = download_file(abs_url, img_dir, filename)
                        if local_path:
                            tag[attr] = f"assets/images/{saved_name}"

# Main tag download and remapping
def download_and_rewrite_tag_src(tag, attr, page_url, target_dir, subfolder, css_dir, font_dir, img_dir):
    url = tag.get(attr)
    if not url or url.startswith('data:') or url.startswith('javascript:') or url.startswith('#'):
        return
    
    abs_url = urljoin(page_url, url)
    parsed_abs = urlparse(abs_url)
    if parsed_abs.netloc and DOMAIN not in parsed_abs.netloc and 'gstatic' not in parsed_abs.netloc and 'googleapis' not in parsed_abs.netloc:
        return
        
    filename = get_filename_from_url(abs_url)
    
    local_path, saved_name = download_file(abs_url, target_dir, filename)
    if local_path:
        if subfolder == "css" and filename.endswith('.css'):
            try:
                with open(local_path, 'r', encoding='utf-8', errors='ignore') as f:
                    css_content = f.read()
                processed_css = process_css_content(css_content, abs_url, font_dir, img_dir)
                processed_css = process_css_imports(processed_css, abs_url, css_dir, font_dir, img_dir)
                with open(local_path, 'w', encoding='utf-8') as f:
                    f.write(processed_css)
            except Exception as e:
                print(f"Error processing downloaded CSS file {abs_url}: {e}")
                
        tag[attr] = f"assets/{subfolder}/{saved_name}"

def rewrite_anchor_links(soup, page_url, page_dir, url_to_local_html):
    for tag in soup.find_all('a', href=True):
        href = tag['href'].strip()
        if href.startswith('#') or href.startswith('javascript:') or href.startswith('mailto:') or href.startswith('tel:'):
            continue
            
        abs_url = urljoin(page_url, href)
        norm_url = normalize_url(abs_url)
        
        if norm_url and norm_url in url_to_local_html:
            target_html_path = url_to_local_html[norm_url]
            rel_link = os.path.relpath(target_html_path, page_dir).replace('\\', '/')
            tag['href'] = rel_link
        elif norm_url:
            if 'wp-login' in abs_url or 'wp-admin' in abs_url:
                tag['href'] = '#'

def main():
    if not os.path.exists(CRAWL_FILE):
        print(f"Error: Crawl results file not found at {CRAWL_FILE}")
        return

    with open(CRAWL_FILE, "r") as f:
        crawl_data = json.load(f)

    url_to_local_html = {}
    valid_pages = []

    for url in crawl_data.get("visited_pages", []):
        norm = normalize_url(url)
        if norm:
            if norm not in url_to_local_html:
                parsed = urlparse(norm)
                path_parts = [p for p in parsed.path.split('/') if p]
                if not path_parts:
                    html_path = os.path.join(ROOT_DIR, "index.html")
                else:
                    html_path = os.path.join(ROOT_DIR, *path_parts, "index.html")
                
                url_to_local_html[norm] = html_path
                valid_pages.append((norm, html_path))
                
    print(f"Found {len(valid_pages)} valid pages to mirror locally.")

    for index, (page_url, target_html_path) in enumerate(valid_pages):
        print(f"\n[{index+1}/{len(valid_pages)}] Mirroring Page: {page_url}")
        
        page_dir, css_dir, js_dir, img_dir, font_dir = get_page_dirs(page_url)
        
        try:
            response = requests.get(page_url, headers=HEADERS, timeout=20)
            if response.status_code != 200:
                print(f"Failed to fetch page HTML for {page_url}: HTTP {response.status_code}")
                continue
            html_content = response.text
        except Exception as e:
            print(f"Error fetching page HTML for {page_url}: {e}")
            continue

        soup = BeautifulSoup(html_content, 'html.parser')
        
        for link in soup.find_all('link', rel='stylesheet'):
            download_and_rewrite_tag_src(link, 'href', page_url, css_dir, "css", css_dir, font_dir, img_dir)
            
        for script in soup.find_all('script', src=True):
            download_and_rewrite_tag_src(script, 'src', page_url, js_dir, "js", css_dir, font_dir, img_dir)
            
        for img in soup.find_all('img', src=True):
            download_and_rewrite_tag_src(img, 'src', page_url, img_dir, "images", css_dir, font_dir, img_dir)
            
        for src_tag in soup.find_all('source', src=True):
            download_and_rewrite_tag_src(src_tag, 'src', page_url, img_dir, "images", css_dir, font_dir, img_dir)
            
        for icon in soup.find_all('link', rel=lambda x: x and any(keyword in x.lower() for keyword in ['icon', 'shortcut', 'apple-touch'])):
            download_and_rewrite_tag_src(icon, 'href', page_url, img_dir, "images", css_dir, font_dir, img_dir)

        process_html_srcsets(soup, page_url, img_dir)
        process_lazy_load_attributes(soup, page_url, img_dir)
        process_inline_styles(soup, page_url, font_dir, img_dir)
        rewrite_anchor_links(soup, page_url, page_dir, url_to_local_html)

        with open(target_html_path, 'w', encoding='utf-8') as f:
            f.write(str(soup))
            
        print(f"Saved local page at {target_html_path}")

    print("\n[SUCCESS] Mirroring complete! All pages and assets cloned locally.")

if __name__ == "__main__":
    main()
