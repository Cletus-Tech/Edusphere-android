# Capacitor
-keep class com.getcapacitor.** { *; }
-keep public class * extends com.getcapacitor.Plugin
-keepclassmembers class * extends com.getcapacitor.Plugin { public *; }

# Firebase Cloud Messaging
-keep class com.google.firebase.messaging.** { *; }
-keep class com.google.firebase.** { *; }

# WebView JS interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# General Android
-keepattributes *Annotation*
-keepattributes SourceFile,LineNumberTable
