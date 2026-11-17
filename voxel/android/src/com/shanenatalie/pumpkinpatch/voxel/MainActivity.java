package com.shanenatalie.pumpkinpatch.voxel;

import android.app.Activity;
import android.app.AlertDialog;
import android.content.Intent;
import android.content.res.Configuration;
import android.graphics.Color;
import android.hardware.input.InputManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.util.Base64;
import android.util.Log;
import android.view.InputDevice;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.webkit.ConsoleMessage;
import android.webkit.JavascriptInterface;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;
import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;

/** Permission-free offline host; its small JavaScript interface handles backups and fullscreen. */
public final class MainActivity extends Activity implements InputManager.InputDeviceListener {
    private static final String ORIGIN="https://appassets.androidplatform.net/";
    private static final int IMPORT=41,EXPORT=42,NATIVE_IMPORT=43,MAX_SAVE=8000000;
    private WebView web;
    private InputManager inputs;
    private ValueCallback<Uri[]> importCallback;
    private byte[] pendingExport;
    private String nativeImport;
    private boolean foreground=true,audioGesture=false,padQueued=false,closing=false;
    private final Handler handler=new Handler(Looper.getMainLooper());
    private int padDevice=-1;
    private String padName="Android gamepad";
    private final float[] axes=new float[4],digital=new float[18];
    private float leftTrigger=0,rightTrigger=0,hatX=0,hatY=0;

    @Override public void onCreate(Bundle state) {
        super.onCreate(state);
        FrameLayout root=new FrameLayout(this); root.setBackgroundColor(Color.rgb(33,25,43));
        root.setOnApplyWindowInsetsListener((view,insets)->{
            int l=insets.getSystemWindowInsetLeft(),t=insets.getSystemWindowInsetTop(),r=insets.getSystemWindowInsetRight(),b=insets.getSystemWindowInsetBottom();
            if(android.os.Build.VERSION.SDK_INT>=28&&insets.getDisplayCutout()!=null){
                l=Math.max(l,insets.getDisplayCutout().getSafeInsetLeft()); t=Math.max(t,insets.getDisplayCutout().getSafeInsetTop());
                r=Math.max(r,insets.getDisplayCutout().getSafeInsetRight()); b=Math.max(b,insets.getDisplayCutout().getSafeInsetBottom());
            }
            view.setPadding(l,t,r,b); return insets;
        });
        web=new WebView(this); web.setBackgroundColor(Color.rgb(33,25,43));
        root.addView(web,new FrameLayout.LayoutParams(-1,-1)); setContentView(root);
        WebSettings settings=web.getSettings(); settings.setJavaScriptEnabled(true); settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(false); settings.setAllowContentAccess(true); settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT); settings.setMediaPlaybackRequiresUserGesture(true);
        settings.setSupportMultipleWindows(false); settings.setBuiltInZoomControls(false); settings.setDisplayZoomControls(false);
        web.setRendererPriorityPolicy(WebView.RENDERER_PRIORITY_IMPORTANT,true);
        web.addJavascriptInterface(new BackupBridge(),"PumpkinAndroid");
        web.setWebViewClient(new WebViewClient(){
            @Override public boolean shouldOverrideUrlLoading(WebView view,WebResourceRequest request){return !request.getUrl().toString().equals(ORIGIN+"index.html");}
            @Override public WebResourceResponse shouldInterceptRequest(WebView view,WebResourceRequest request){
                Uri uri=request.getUrl(); String url=uri.toString(),path=uri.getPath();
                if(url.equals(ORIGIN+"index.html"))return asset("index.html","text/html",false);
                if(url.equals(ORIGIN+"assets/android-shell.js"))return asset("android-shell.js","application/javascript",false);
                if(url.equals(ORIGIN+"assets/asset-manifest.json"))return asset("asset-manifest.json","application/json",false);
                if("https".equals(uri.getScheme())&&"appassets.androidplatform.net".equals(uri.getHost())&&path!=null&&path.matches("/assets/media/[a-f0-9]{64}\\.[a-z0-9]+")&&uri.getQuery()==null){
                    String name=path.substring("/assets/".length());return asset(name,mime(name),true);
                }
                return missing();
            }
            @Override public boolean onRenderProcessGone(WebView view,RenderProcessGoneDetail detail){
                if(web==view)web=null;
                android.view.ViewParent parent=view.getParent();if(parent instanceof android.view.ViewGroup)((android.view.ViewGroup)parent).removeView(view);view.destroy();
                if(!closing)new AlertDialog.Builder(MainActivity.this).setTitle("The game renderer stopped").setMessage("Your saved farm is still on this device. Reopen the game to load it.").setNegativeButton("Close",(d,w)->finish()).setPositiveButton("Reopen",(d,w)->recreate()).show();
                return true;
            }
        });
        web.setWebChromeClient(new WebChromeClient(){
            @Override public boolean onShowFileChooser(WebView view,ValueCallback<Uri[]> callback,FileChooserParams params){
                if(importCallback!=null)importCallback.onReceiveValue(null); importCallback=callback;
                try{startActivityForResult(openDocument(),IMPORT);}catch(RuntimeException e){importCallback=null;callback.onReceiveValue(null);message("No file picker is available.");}
                return true;
            }
            @Override public boolean onConsoleMessage(ConsoleMessage message){
                if(message.messageLevel()==ConsoleMessage.MessageLevel.ERROR)Log.e("PumpkinVoxel",message.message().substring(0,Math.min(1000,message.message().length())));
                return false;
            }
        });
        inputs=(InputManager)getSystemService(INPUT_SERVICE); inputs.registerInputDeviceListener(this,handler);
        immersive(); web.loadUrl(ORIGIN+"index.html");
    }
    private WebResourceResponse asset(String path,String mime,boolean immutable){
        try{
            Map<String,String> headers=new HashMap<>(); headers.put("Cache-Control",immutable?"public, max-age=31536000, immutable":"no-cache"); headers.put("X-Content-Type-Options","nosniff");
            return new WebResourceResponse(mime,mime.startsWith("text/")||mime.contains("javascript")||mime.contains("json")?"UTF-8":null,200,"OK",headers,getAssets().open(path));
        }catch(Exception error){return missing();}
    }
    private WebResourceResponse missing(){return new WebResourceResponse("text/plain","UTF-8",404,"Not found",null,new ByteArrayInputStream(new byte[0]));}
    private String mime(String name){
        if(name.endsWith(".webp"))return "image/webp"; if(name.endsWith(".png"))return "image/png";
        if(name.endsWith(".jpg")||name.endsWith(".jpeg"))return "image/jpeg"; if(name.endsWith(".mp3"))return "audio/mpeg";
        if(name.endsWith(".woff2"))return "font/woff2"; if(name.endsWith(".woff"))return "font/woff";
        if(name.endsWith(".mid")||name.endsWith(".midi"))return "audio/midi";return "application/octet-stream";
    }
    private Intent openDocument(){Intent i=new Intent(Intent.ACTION_OPEN_DOCUMENT);i.addCategory(Intent.CATEGORY_OPENABLE);i.setType("*/*");return i;}
    private void immersive(){getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY|View.SYSTEM_UI_FLAG_FULLSCREEN|View.SYSTEM_UI_FLAG_HIDE_NAVIGATION|View.SYSTEM_UI_FLAG_LAYOUT_STABLE|View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN|View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);}
    @Override public void onConfigurationChanged(Configuration configuration){super.onConfigurationChanged(configuration);immersive();}
    @Override public void onWindowFocusChanged(boolean focus){super.onWindowFocusChanged(focus);if(focus)immersive();else releasePad();}
    private void js(String script){if(web!=null)web.evaluateJavascript(script,null);}
    @Override protected void onPause(){foreground=false;releasePad();if(web!=null)web.evaluateJavascript("window.PumpkinNative?.foreground(false)",ignored->{if(!foreground&&web!=null){web.onPause();web.pauseTimers();}});super.onPause();}
    @Override protected void onResume(){super.onResume();foreground=true;if(web!=null){web.onResume();web.resumeTimers();js("window.PumpkinNative?.foreground(true)");}}
    @Override public void onBackPressed(){
        if(web==null||closing)return;web.evaluateJavascript("window.PumpkinNative?.back()===true",handled->{if(!"true".equals(handled)&&!closing){closing=true;new AlertDialog.Builder(this).setTitle("Leave the patch?").setMessage("Your farm is saved on this device.").setNegativeButton("Keep playing",(d,w)->closing=false).setPositiveButton("Save & close",(d,w)->{if(web!=null)web.evaluateJavascript("window.PumpkinVoxel?.save()",v->finish());else finish();}).setOnCancelListener(d->closing=false).show();}});
    }
    private static float bounded(float value){return Float.isNaN(value)||Float.isInfinite(value)?0:Math.max(-1,Math.min(1,value));}
    private boolean isPad(int source){return (source&InputDevice.SOURCE_GAMEPAD)==InputDevice.SOURCE_GAMEPAD||(source&InputDevice.SOURCE_JOYSTICK)==InputDevice.SOURCE_JOYSTICK;}
    private void identifyPad(InputDevice device){
        if(device==null)return;if(padDevice!=device.getId())releasePad();padDevice=device.getId();
        String name=device.getName();padName=(device.getVendorId()==1356||name.toLowerCase().matches(".*(dualsense|dualshock|playstation|ps5|ps4).*"))?"DualSense Android: "+name:name;
    }
    private int button(int key){switch(key){case KeyEvent.KEYCODE_BUTTON_A:return 0;case KeyEvent.KEYCODE_BUTTON_B:return 1;case KeyEvent.KEYCODE_BUTTON_X:return 2;case KeyEvent.KEYCODE_BUTTON_Y:return 3;case KeyEvent.KEYCODE_BUTTON_L1:return 4;case KeyEvent.KEYCODE_BUTTON_R1:return 5;case KeyEvent.KEYCODE_BUTTON_L2:return 6;case KeyEvent.KEYCODE_BUTTON_R2:return 7;case KeyEvent.KEYCODE_BUTTON_SELECT:return 8;case KeyEvent.KEYCODE_BUTTON_START:return 9;case KeyEvent.KEYCODE_BUTTON_THUMBL:return 10;case KeyEvent.KEYCODE_BUTTON_THUMBR:return 11;case KeyEvent.KEYCODE_DPAD_UP:return 12;case KeyEvent.KEYCODE_DPAD_DOWN:return 13;case KeyEvent.KEYCODE_DPAD_LEFT:return 14;case KeyEvent.KEYCODE_DPAD_RIGHT:return 15;case KeyEvent.KEYCODE_BUTTON_MODE:return 16;case KeyEvent.KEYCODE_BUTTON_1:return 17;default:return -1;}}
    private void controllerGesture(){
        if(audioGesture||web==null)return;audioGesture=true;
        // A physical controller press is the explicit first play gesture.
        web.getSettings().setMediaPlaybackRequiresUserGesture(false);js("window.PumpkinNative?.unlockAudio()");
    }
    private void trustedKeyGesture(){
        if(web==null)return;
        // Native keyboard dispatch grants transient activation without faking a JS flag.
        long now=android.os.SystemClock.uptimeMillis();
        web.dispatchKeyEvent(new KeyEvent(now,now,KeyEvent.ACTION_DOWN,KeyEvent.KEYCODE_F12,0));
        web.dispatchKeyEvent(new KeyEvent(now,now,KeyEvent.ACTION_UP,KeyEvent.KEYCODE_F12,0));
    }
    @Override public boolean dispatchKeyEvent(KeyEvent event){
        if(isPad(event.getSource())||(event.getDevice()!=null&&(event.getDevice().supportsSource(InputDevice.SOURCE_GAMEPAD)||event.getDevice().supportsSource(InputDevice.SOURCE_JOYSTICK)))){int key=button(event.getKeyCode());if(key>=0){identifyPad(event.getDevice());digital[key]=event.getAction()==KeyEvent.ACTION_UP?0:1;if(event.getAction()==KeyEvent.ACTION_DOWN){controllerGesture();trustedKeyGesture();}sendPad();return true;}}
        return super.dispatchKeyEvent(event);
    }
    private float trigger(MotionEvent event,int axis,int alternate){
        InputDevice device=event.getDevice();InputDevice.MotionRange range=device==null?null:device.getMotionRange(axis,event.getSource());
        if(range==null){axis=alternate;range=device==null?null:device.getMotionRange(axis,event.getSource());}
        if(range==null)return 0;float value=event.getAxisValue(axis);return Math.max(0,Math.min(1,range.getMin()<-.5f?(value+1)/2:value));
    }
    @Override public boolean dispatchGenericMotionEvent(MotionEvent event){
        if(isPad(event.getSource())&&event.getAction()==MotionEvent.ACTION_MOVE){
            identifyPad(event.getDevice());axes[0]=bounded(event.getAxisValue(MotionEvent.AXIS_X));axes[1]=bounded(event.getAxisValue(MotionEvent.AXIS_Y));
            InputDevice device=event.getDevice();boolean zr=device!=null&&device.getMotionRange(MotionEvent.AXIS_Z,event.getSource())!=null&&device.getMotionRange(MotionEvent.AXIS_RZ,event.getSource())!=null;
            axes[2]=bounded(event.getAxisValue(zr?MotionEvent.AXIS_Z:MotionEvent.AXIS_RX));axes[3]=bounded(event.getAxisValue(zr?MotionEvent.AXIS_RZ:MotionEvent.AXIS_RY));
            leftTrigger=trigger(event,MotionEvent.AXIS_LTRIGGER,MotionEvent.AXIS_BRAKE);rightTrigger=trigger(event,MotionEvent.AXIS_RTRIGGER,MotionEvent.AXIS_GAS);
            hatX=bounded(event.getAxisValue(MotionEvent.AXIS_HAT_X));hatY=bounded(event.getAxisValue(MotionEvent.AXIS_HAT_Y));
            if(Math.abs(axes[0])+Math.abs(axes[1])+Math.abs(axes[2])+Math.abs(axes[3])+leftTrigger+rightTrigger> .35)controllerGesture();
            if(!padQueued){padQueued=true;handler.postDelayed(()->{padQueued=false;sendPad();},16);}return true;
        }
        return super.dispatchGenericMotionEvent(event);
    }
    private void sendPad(){
        try{JSONObject pad=new JSONObject();pad.put("connected",foreground&&padDevice>=0);pad.put("id",padName);pad.put("index",0);pad.put("timestamp",android.os.SystemClock.uptimeMillis());
            JSONArray a=new JSONArray(),b=new JSONArray();for(float value:axes)a.put(value);
            for(int i=0;i<18;i++){float value=digital[i];if(i==6)value=Math.max(value,leftTrigger);if(i==7)value=Math.max(value,rightTrigger);if(i==12&&hatY<-.5)value=1;if(i==13&&hatY>.5)value=1;if(i==14&&hatX<-.5)value=1;if(i==15&&hatX>.5)value=1;b.put(value);}pad.put("axes",a);pad.put("buttons",b);js("window.PumpkinNative?.receivePad("+pad.toString()+")");
        }catch(Exception ignored){}
    }
    private void releasePad(){for(int i=0;i<axes.length;i++)axes[i]=0;for(int i=0;i<digital.length;i++)digital[i]=0;leftTrigger=rightTrigger=hatX=hatY=0;padDevice=-1;sendPad();}
    @Override public void onInputDeviceAdded(int id){}
    @Override public void onInputDeviceChanged(int id){if(id==padDevice)releasePad();}
    @Override public void onInputDeviceRemoved(int id){if(id==padDevice)releasePad();}
    public final class BackupBridge {
        @JavascriptInterface public void fullscreen(){runOnUiThread(()->immersive());}
        @JavascriptInterface public void exportBackup(String json,String filename){
            if(json==null||json.length()>MAX_SAVE){runOnUiThread(()->message("Backup is too large."));return;}
            try{new JSONObject(json);}catch(Exception e){runOnUiThread(()->message("Backup could not be prepared."));return;}
            byte[] data=json.getBytes(StandardCharsets.UTF_8);runOnUiThread(()->{
                if(pendingExport!=null){message("Finish the current backup first.");return;}pendingExport=data;
                Intent intent=new Intent(Intent.ACTION_CREATE_DOCUMENT);intent.addCategory(Intent.CATEGORY_OPENABLE);intent.setType("application/json");intent.putExtra(Intent.EXTRA_TITLE,filename!=null&&filename.matches("[a-zA-Z0-9_. -]+\\.json")?filename:"pumpkin-patch-voxel-save.json");
                try{startActivityForResult(intent,EXPORT);}catch(RuntimeException e){pendingExport=null;message("No file picker is available.");}
            });
        }
        @JavascriptInterface public void pickSaveFile(String requestId){runOnUiThread(()->{if(nativeImport!=null){fileReply(requestId,null,null,"Another picker is already open.");return;}nativeImport=requestId;try{startActivityForResult(openDocument(),NATIVE_IMPORT);}catch(RuntimeException e){nativeImport=null;fileReply(requestId,null,null,"No file picker is available.");}});}
    }
    private void fileReply(String id,String name,String data,String error){js("window.PumpkinNative?.receiveFile("+JSONObject.quote(id)+","+(name==null?"null":JSONObject.quote(name))+","+(data==null?"null":JSONObject.quote(data))+","+(error==null?"null":JSONObject.quote(error))+")");}
    @Override protected void onActivityResult(int request,int result,Intent intent){
        super.onActivityResult(request,result,intent);
        if(request==IMPORT&&importCallback!=null){ValueCallback<Uri[]> callback=importCallback;importCallback=null;callback.onReceiveValue(result==RESULT_OK&&intent!=null&&intent.getData()!=null?new Uri[]{intent.getData()}:null);}
        else if(request==NATIVE_IMPORT){String id=nativeImport;nativeImport=null;if(id==null)return;if(result!=RESULT_OK||intent==null||intent.getData()==null){fileReply(id,null,null,"cancelled");return;}
            try(InputStream input=getContentResolver().openInputStream(intent.getData());ByteArrayOutputStream output=new ByteArrayOutputStream()){
                byte[] chunk=new byte[16384];int n;while((n=input.read(chunk))!=-1){if(output.size()+n>MAX_SAVE)throw new java.io.IOException("Too large");output.write(chunk,0,n);}fileReply(id,"pumpkin-patch-save.json",Base64.encodeToString(output.toByteArray(),Base64.NO_WRAP),null);
            }catch(Exception e){fileReply(id,null,null,"The save file could not be read.");}
        }else if(request==EXPORT){byte[] data=pendingExport;pendingExport=null;if(result!=RESULT_OK||intent==null||intent.getData()==null||data==null)return;
            try(OutputStream output=getContentResolver().openOutputStream(intent.getData(),"wt")){if(output==null)throw new java.io.IOException("No output");output.write(data);message("Farm backup saved.");}catch(Exception e){message("Backup could not be saved. Try again.");}
        }
        immersive();
    }
    private void message(String text){Toast.makeText(this,text,Toast.LENGTH_LONG).show();}
    @Override protected void onDestroy(){closing=true;if(inputs!=null)inputs.unregisterInputDeviceListener(this);if(importCallback!=null)importCallback.onReceiveValue(null);handler.removeCallbacksAndMessages(null);if(web!=null){web.removeJavascriptInterface("PumpkinAndroid");web.destroy();web=null;}pendingExport=null;super.onDestroy();}
}
