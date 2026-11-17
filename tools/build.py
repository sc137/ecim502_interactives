#!/usr/bin/env python3
"""Generate static entry pages; production needs no Python or framework."""
from pathlib import Path
import argparse
import html
import hashlib
import json
import re

ROOT = Path(__file__).resolve().parents[1]

def render(name, values):
    source = (ROOT / 'templates' / name).read_text()
    def substitute(match):
        key = match.group(1)
        if key not in values:
            raise ValueError(f'Missing template value: {key}')
        return str(values[key])
    return re.sub(r'\{\{(\w+)\}\}', substitute, source)

def asset_url(config_path, name):
    asset = config_path.parent / name
    digest = hashlib.sha256(asset.read_bytes()).hexdigest()[:12]
    return html.escape(name + '?v=' + digest, quote=True)

def mobile_tables(content):
    """Generate a linear reading view for simple, read-only comparison tables."""
    def convert(match):
        table = match.group(0)
        if re.search(r'<(?:input|select|button|form|table)\b', table[6:], re.I):
            return table
        if re.search(r'\b(?:colspan|rowspan)=', table, re.I):
            return table
        heading = re.search(r'<thead\b[^>]*>(.*?)</thead>', table, re.S)
        body = re.search(r'<tbody\b[^>]*>(.*?)</tbody>', table, re.S)
        if not heading or not body:
            return table
        headers = re.findall(r'<th\b[^>]*>(.*?)</th>', heading.group(1), re.S)
        labels = [html.escape(html.unescape(re.sub('<[^>]+>', '', value)).strip()) for value in headers]
        caption = re.search(r'<caption\b[^>]*>(.*?)</caption>', table, re.S)
        title = caption.group(1) if caption else 'Comparison'
        cards = []
        for row in re.findall(r'<tr\b[^>]*>(.*?)</tr>', body.group(1), re.S):
            cells = [cell[1] for cell in re.findall(r'<(th|td)\b[^>]*>(.*?)</\1>', row, re.S)]
            if len(cells) != len(labels) or re.search(r'\bid=', ''.join(cells)):
                return table
            details = ''.join('<dt>' + label + '</dt><dd>' + value + '</dd>'
                              for label, value in zip(labels[1:], cells[1:]))
            cards.append('<div class="mobile-table-card" role="listitem"><p class="mobile-table-row-title">'
                         + cells[0] + '</p><dl>' + details + '</dl></div>')
        if not cards:
            return table
        table = re.sub(r'class="([^"]*)"', r'class="\1 mobile-card-table"', table, count=1)
        return (table + '<div class="mobile-table-cards"><p class="mobile-table-caption">' + title
                + '</p><div role="list">' + ''.join(cards) + '</div></div>')
    return re.sub(r'<table\b[^>]*class="[^"]*emeritus-table[^"]*".*?</table>', convert, content, flags=re.S)

def build(config_path):
    config = json.loads(config_path.read_text())
    values = {key: html.escape(str(config.get(key, '')), quote=True)
              for key in ['title', 'head_title', 'description', 'updated']}
    values['stylesheets'] = '\n  '.join(f'<link rel="stylesheet" href="{asset_url(config_path, path)}">'
                                         for path in config['stylesheets'])
    values['settings'] = json.dumps(config['settings'], separators=(',', ':')).replace('<', '\\u003c')
    values['content'] = mobile_tables(config_path.with_name('content.html').read_text().strip())
    values['ui_script'] = asset_url(config_path, '../shared/ui.js')
    values['app_script'] = asset_url(config_path, 'app.js')
    if config.get('layout') == 'slideshow':
        return render('slideshow.html', values)
    nav = config['navigation']
    tabs = []
    for index, tab in enumerate(nav['tabs']):
        tabs.append(render('tab.html', {
            'tab_id': html.escape(tab['id'], quote=True),
            'panel_id': html.escape(tab['panel'], quote=True),
            'label': html.escape(tab['label']),
            'selected': 'true' if index == 0 else 'false',
            'tabindex': '0' if index == 0 else '-1',
            'badge_id': ' id="' + html.escape(tab['badge_id'], quote=True) + '"' if tab.get('badge_id') else ''
        }).strip())
    values['section_options'] = ''.join(
        '<option value="' + html.escape(tab['id'], quote=True) + '">' + html.escape(tab['label']) + '</option>'
        for tab in nav['tabs'])
    values.update(section_count=len(nav['tabs']),
                  percent_badge='<span id="exploration-percent-badge" class="progress-badge">0%</span>' if nav['percent'] else '',
                  claim_button=nav['claim'], reset_button=nav['reset'], tabs='\n    '.join(tabs),
                  sources=config['sources'])
    values['header'] = render('header.html', values)
    values['navigation'] = render('navigation.html', values)
    values['footer'] = render('footer.html', values)
    return render('page.html', values)

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Fail if generated pages are out of date; write nothing.')
    args = parser.parse_args()
    stale = []
    configs = sorted(ROOT.glob('*/page.json'))
    for config in configs:
        output = config.with_name('index.html')
        expected = build(config)
        if not output.exists() or output.read_text() != expected:
            if args.check:
                stale.append(str(output.relative_to(ROOT)))
            else:
                output.write_text(expected)
    if stale:
        raise SystemExit('Rebuild required: ' + ', '.join(stale))
    print(f'{"Verified" if args.check else "Generated"} {len(configs)} static entry pages.')

if __name__ == '__main__':
    main()
