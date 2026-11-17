"""Regression checks for safe single-source mobile table generation."""
import unittest
from build import mobile_tables

TABLE = '''<table class="emeritus-table"><caption>Comparison</caption>
<thead><tr><th>Tool</th><th>Purpose</th><th>Cost</th></tr></thead>
<tbody><tr><th scope="row">Freeze</th><td>Restrict access</td><td>Free</td></tr></tbody></table>'''

class MobileTablesTest(unittest.TestCase):
    def test_simple_rows_have_labeled_mobile_details(self):
        output = mobile_tables(TABLE)
        self.assertIn('mobile-card-table', output)
        self.assertIn('<dt>Purpose</dt><dd>Restrict access</dd>', output)
        self.assertIn('<dt>Cost</dt><dd>Free</dd>', output)
        self.assertEqual(output.count('class="mobile-table-card"'), 1)

    def test_links_keep_their_destination_and_new_tab_behavior(self):
        source = TABLE.replace('Restrict access', '<a href="https://example.org/" target="_blank" rel="noopener">Details</a>')
        output = mobile_tables(source)
        self.assertEqual(output.count('href="https://example.org/" target="_blank" rel="noopener"'), 2)

    def test_interactive_cells_are_not_duplicated(self):
        source = TABLE.replace('Restrict access', '<input id="choice" type="checkbox">')
        self.assertEqual(mobile_tables(source), source)

    def test_merged_cells_keep_the_original_table(self):
        source = TABLE.replace('<td>Free</td>', '<td colspan="2">Free</td>')
        self.assertEqual(mobile_tables(source), source)

    def test_cell_ids_are_not_duplicated(self):
        source = TABLE.replace('Restrict access', '<span id="detail">Restrict access</span>')
        self.assertEqual(mobile_tables(source), source)

    def test_inconsistent_columns_keep_the_original_table(self):
        source = TABLE.replace('<td>Free</td>', '')
        self.assertEqual(mobile_tables(source), source)

if __name__ == '__main__':
    unittest.main()
