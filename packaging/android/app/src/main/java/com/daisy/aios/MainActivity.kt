package com.daisy.aios

import android.app.Activity
import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient

class MainActivity : Activity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        val endpoint = intent.getStringExtra("AI_OS_ENDPOINT") ?: "http://127.0.0.1:8787"
        val view = WebView(this)
        view.settings.javaScriptEnabled = true
        view.settings.domStorageEnabled = true
        view.webViewClient = WebViewClient()
        view.loadDataWithBaseURL(null, """
            <html><body style='font-family:sans-serif;background:#070b16;color:#e6edf7;padding:24px'>
            <h1>Daisy AI OS</h1><p>Runtime endpoint: $endpoint</p>
            <button onclick='fetch("$endpoint/runtime/status").then(r=>r.json()).then(x=>document.getElementById("out").textContent=JSON.stringify(x,null,2))'>Check runtime</button>
            <pre id='out'></pre></body></html>
        """.trimIndent(), "text/html", "UTF-8", null)
        setContentView(view)
    }
}
