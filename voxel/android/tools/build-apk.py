#!/usr/bin/env python3
"""Build the offline voxel host with API35 tools; generated assets and signing stay outside source."""
import argparse, hashlib, json, os, secrets, shutil, subprocess, sys, zipfile
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
p=argparse.ArgumentParser(description=__doc__)
p.add_argument('--html',type=Path,required=True)
p.add_argument('--expected-sha256',required=True)
p.add_argument('--sdk',type=Path,default=Path(os.environ.get('ANDROID_SDK_ROOT','/workspace/android-toolchain/sdk')))
p.add_argument('--compiler',type=Path,default=Path('/workspace/android-toolchain/ecj.jar'))
p.add_argument('--output-dir',type=Path,default=Path('/workspace/android-voxel-build'))
p.add_argument('--signing-dir',type=Path,default=Path('/workspace/.pumpkin-voxel-android-signing'))
a=p.parse_args();build=a.output_dir.resolve();build.mkdir(parents=True,exist_ok=True)
tools=a.sdk/'build-tools/35.0.0';platform=a.sdk/'platforms/android-35/android.jar'
def sha(path):return hashlib.sha256(path.read_bytes()).hexdigest()
def run(*args):subprocess.run([str(x) for x in args],check=True,cwd=ROOT)
for f in [a.html,platform,a.compiler,tools/'aapt2',tools/'d8',tools/'zipalign',tools/'apksigner',ROOT/'assets/android-shell.js']:
 if not f.is_file():raise SystemExit('Missing required input: '+str(f))
if sha(a.html)!=a.expected_sha256:raise SystemExit('The input HTML is not the reviewed build.')
assets=build/'assets'
run(sys.executable,ROOT/'tools/extract-assets.py','--input',a.html,'--output-dir',assets)
manifest=json.loads((assets/'asset-manifest.json').read_text())
index=assets/'index.html';html=index.read_text();needle='<head>'
if needle not in html:raise SystemExit('Expected a standalone head for the native shell.')
html=html.replace(needle,needle+'<script src="https://appassets.androidplatform.net/assets/android-shell.js"></script>',1)
index.write_text(html);shutil.copyfile(ROOT/'assets/android-shell.js',assets/'android-shell.js')
classes=build/'classes';dex=build/'dex'
for f in [classes,dex]:shutil.rmtree(f,ignore_errors=True);f.mkdir()
run(tools/'aapt2','compile','--dir',ROOT/'res','-o',build/'resources.zip')
run(tools/'aapt2','link','-o',build/'base.apk','-I',platform,'--manifest',ROOT/'AndroidManifest.xml','-A',assets,'-0','webp','-0','png','-0','mp3','-0','woff','-0','woff2',build/'resources.zip')
run('java','-jar',a.compiler,'-8','-warn:none','-bootclasspath',str(platform)+os.pathsep+str(tools/'core-lambda-stubs.jar'),'-d',classes,*sorted((ROOT/'src').rglob('*.java')))
run(tools/'d8','--release','--min-api','26','--lib',platform,'--output',dex,*sorted(classes.rglob('*.class')))
shutil.copyfile(build/'base.apk',build/'unsigned.apk')
with zipfile.ZipFile(build/'unsigned.apk','a',compression=zipfile.ZIP_DEFLATED) as z:
 for f in dex.glob('*.dex'):z.write(f,f.name)
run(tools/'zipalign','-f','-p','4',build/'unsigned.apk',build/'aligned.apk')
signing=a.signing_dir.resolve();signing.mkdir(mode=0o700,parents=True,exist_ok=True);signing.chmod(0o700)
password=signing/'password';key=signing/'pumpkin-patch-voxel.p12'
if not key.exists():
 if password.exists():raise SystemExit('A signing password exists without its key; restore the key first.')
 password.write_text(secrets.token_urlsafe(40)+'\n');password.chmod(0o600)
 run('keytool','-genkeypair','-keystore',key,'-storetype','PKCS12','-storepass:file',password,'-keypass:file',password,'-alias','pumpkin-voxel','-keyalg','RSA','-keysize','3072','-validity','10000','-dname','CN=Pumpkin Patch Voxel Local Test, O=Shane and Natalie, C=GB')
 key.chmod(0o600)
if not password.exists():raise SystemExit('Restore the signing password file before signing an update.')
apk=build/'Pumpkin-Patch-Village-Play-Polish.apk'
run(tools/'apksigner','sign','--ks',key,'--ks-key-alias','pumpkin-voxel','--ks-pass','file:'+str(password),'--v4-signing-enabled','false','--out',apk,build/'aligned.apk')
verification=subprocess.check_output([str(tools/'apksigner'),'verify','--verbose','--print-certs',str(apk)],text=True)
(build/'signature-check.txt').write_text(verification)
run(tools/'zipalign','-c','-p','4',apk)
badging=subprocess.check_output([str(tools/'aapt2'),'dump','badging',str(apk)],text=True);(build/'package-check.txt').write_text(badging)
with zipfile.ZipFile(apk) as z:
 assert z.testzip() is None
 assert z.read('assets/index.html')==index.read_bytes()
 assert z.read('assets/android-shell.js')==(ROOT/'assets/android-shell.js').read_bytes()
 for item in manifest['assets']:
  entry=z.getinfo('assets/'+item['path']);assert entry.compress_type==zipfile.ZIP_STORED,item['path']
  assert hashlib.sha256(z.read(entry)).hexdigest()==item['sha256'],item['path']
report={'applicationId':'com.shanenatalie.pumpkinpatch.voxel','versionCode':26110801,'minSdk':26,'targetSdk':35,
 'sourceHtml':manifest['source'],'extractedHtml':manifest['processedHtml'],'packagedHtml':{'bytes':index.stat().st_size,'sha256':sha(index)},
 'shell':{'bytes':(ROOT/'assets/android-shell.js').stat().st_size,'sha256':sha(ROOT/'assets/android-shell.js')},
 'assetStatistics':manifest['statistics'],'apk':{'file':apk.name,'bytes':apk.stat().st_size,'sha256':sha(apk)},
 'checks':{'signature':True,'zipalign':True,'zipCrc':True,'mediaHashes':True,'mediaStoredWithoutRecompression':True},
 'signing':'Persistent local test signing key and random password are outside source; retain them for in-place app updates.',
 'runtime':'Android System WebView/WebGL2, not a native3D rewrite; real hardware/performance verification is separate.'}
(build/'build-report.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps(report,indent=2))
