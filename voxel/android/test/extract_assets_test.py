import base64
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import unittest

SCRIPT = Path(__file__).resolve().parents[1] / 'tools' / 'extract-assets.py'
spec = importlib.util.spec_from_file_location('extract_assets', SCRIPT)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


def uri(mime, data):
    return b'data:' + mime.encode() + b';base64,' + base64.b64encode(data)


class AssetExtraction(unittest.TestCase):
    def run_extract(self, source):
        temporary = tempfile.TemporaryDirectory()
        self.addCleanup(temporary.cleanup)
        base = Path(temporary.name)
        original = base / 'browser.html'
        original.write_bytes(source)
        output = base / 'package'
        report = module.extract_assets(original, output)
        self.assertEqual(original.read_bytes(), source, 'browser HTML is untouched')
        return original, output, report

    def test_dedupes_css_and_js_with_exact_binary_hashes(self):
        picture, audio = b'picture\x00bytes\xff', b'ID3\x01song'
        picture_uri, audio_uri = uri('image/webp', picture), uri('audio/mpeg', audio)
        source = b"<style>a{background:url('" + picture_uri + b"')}</style><script>let a=\"" + picture_uri + b'\",b="' + audio_uri + b'";</script>'
        original, output, report = self.run_extract(source)
        self.assertEqual(report['statistics']['dataUriReferences'], 3)
        self.assertEqual(report['statistics']['uniqueMediaAssets'], 2)
        self.assertEqual(report['statistics']['remainingTargetBase64Uris'], 0)
        self.assertTrue(all(a['url'].startswith('/assets/media/') and not a['url'].startswith('https:') for a in report['assets']), 'root-relative paths preserve narration localClip validation')
        self.assertTrue(all(a['absoluteUrl'] == module.ORIGIN + a['url'] for a in report['assets']))
        cooked = (output / 'index.html').read_bytes()
        expected = source
        for asset in report['assets']:
            data = (output / asset['path']).read_bytes()
            self.assertEqual(hashlib.sha256(data).hexdigest(), asset['sha256'])
            self.assertIn(data, [picture, audio])
            expected = expected.replace(picture_uri if data == picture else audio_uri, asset['url'].encode())
        self.assertEqual(cooked, expected)
        self.assertEqual(report['processedHtml']['sha256'], hashlib.sha256(cooked).hexdigest())
        self.assertEqual(report['source']['sha256'], hashlib.sha256(source).hexdigest())

    def test_json_escaped_slashes_and_unpadded_fonts(self):
        picture = uri('image/webp', b'foo\xff').replace(b'/', b'\\/')
        font = uri('font/woff2', b'font').rstrip(b'=')
        _, output, report = self.run_extract(b'let a="' + picture + b'",font="' + font + b'";')
        self.assertEqual(report['statistics']['uniqueMediaAssets'], 2)
        self.assertEqual(sorted((output / a['path']).read_bytes() for a in report['assets']), [b'font', b'foo\xff'])
        self.assertNotIn(b'data:', (output / 'index.html').read_bytes())

    def test_other_data_and_non_base64_svg_are_retained(self):
        untouched = b'<img src="data:image/svg+xml,%3Csvg/%3E"><script>let a="data:application/json;base64,e30="</script>'
        _, output, report = self.run_extract(untouched)
        self.assertEqual((output / 'index.html').read_bytes(), untouched)
        self.assertEqual(report['statistics']['uniqueMediaAssets'], 0)

    def test_malformed_data_never_partially_rewrites_the_package(self):
        for bad in [b'data:image/png;base64,abc$xyz', b'data:image/png;base64,A', b'data:image/png;base64,a===']:
            with self.subTest(bad=bad), self.assertRaises(ValueError):
                self.run_extract(b'"' + bad + b'"')

    def test_repeat_build_removes_only_previously_generated_stale_files(self):
        original, output, first = self.run_extract(b'"' + uri('image/png', b'first') + b'"')
        extra = output / 'media' / 'notes.txt'
        extra.write_text('keep')
        original.write_bytes(b'"' + uri('image/png', b'second') + b'"')
        second = module.extract_assets(original, output)
        self.assertFalse((output / first['assets'][0]['path']).exists())
        self.assertTrue((output / second['assets'][0]['path']).exists())
        self.assertEqual(extra.read_text(), 'keep')
        self.assertEqual(json.loads((output / 'asset-manifest.json').read_text()), second)

    def test_origin_and_source_are_not_ambiguous(self):
        original, output, _ = self.run_extract(b'"' + uri('font/woff', b'abc') + b'"')
        with self.assertRaises(ValueError):
            module.extract_assets(output / 'index.html', output)
        for origin in ['http://example.test', 'https://user:password@example.test', 'https://example.test/path', 'https://example.test/"']:
            with self.subTest(origin=origin), self.assertRaises(ValueError):
                module.extract_assets(original, output, origin)


if __name__ == '__main__':
    unittest.main()
