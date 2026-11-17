#!/usr/bin/env python3
"""Check generated pages, page configuration, IDs, and local asset links."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit
import json
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]

class Page(HTMLParser):
    def __init__(self):
        super().__init__()
        self.ids = set()
        self.links = []
        self.labels = []
        self.duplicates = []
    def handle_starttag(self, tag, attributes):
        attrs = dict(attributes)
        if 'id' in attrs:
            if attrs['id'] in self.ids:
                self.duplicates.append(attrs['id'])
            self.ids.add(attrs['id'])
        for name in ['src', 'href']:
            if name in attrs:
                self.links.append(attrs[name])
        for name in ['aria-labelledby', 'aria-describedby', 'aria-controls']:
            self.labels.extend(attrs.get(name, '').split())

def check():
    subprocess.run([sys.executable, str(ROOT / 'tools' / 'build.py'), '--check'], check=True)
    configs = sorted(ROOT.glob('*/page.json'))
    for path in configs:
        config = json.loads(path.read_text())
        entry = path.with_name('index.html')
        page = Page()
        page.feed(entry.read_text())
        assert not page.duplicates, (entry, page.duplicates)
        assert all(item in page.ids for item in page.labels), (entry, 'Unresolved accessible label or control')
        for link in page.links:
            url = urlsplit(link)
            if url.scheme or url.netloc:
                continue
            if url.path:
                assert (entry.parent / unquote(url.path)).exists(), (entry, link)
            elif url.fragment:
                assert unquote(url.fragment) in page.ids, (entry, link)
        for tab in config.get('navigation', {}).get('tabs', []):
            assert tab['id'] in page.ids and tab['panel'] in page.ids, (entry, tab)
    readme = (ROOT / 'README.md').read_text()
    names = re.findall(r'https://sc137.github.io/ecim502_interactives/([^/)]+)/', readme)
    assert len(names) == len(set(names)) == len(configs)
    assert all((ROOT / name / 'index.html').is_file() for name in names)
    print(f'Checked {len(configs)} tools: README links, unique IDs, accessible references, and local assets.')

if __name__ == '__main__':
    check()
