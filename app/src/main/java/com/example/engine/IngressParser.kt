package com.example.engine

import com.example.data.IngressFile
import com.example.data.DaisyRepository
import java.io.ByteArrayInputStream
import java.util.zip.ZipInputStream

class IngressParser(private val repository: DaisyRepository) {

    /**
     * Ingests a raw file structure. Auto-classifies based on name, path, extension, or content.
     */
    suspend fun ingestFile(name: String, path: String, content: String) {
        val bucket = determineBucket(name, path, content)
        val file = IngressFile(
            name = name,
            path = path,
            bucket = bucket,
            content = content,
            size = content.length.toLong()
        )
        repository.insertIngressFile(file)
        repository.log("Ingested file $name into [$bucket] bucket. Ref Graph updated.", "INFO")
    }

    /**
     * Unpacks a ZIP archive represented as bytes and indexes all files inside.
     */
    suspend fun ingestZipArchive(zipBytes: ByteArray) {
        var fileCount = 0
        try {
            ZipInputStream(ByteArrayInputStream(zipBytes)).use { zis ->
                var entry = zis.nextEntry
                while (entry != null) {
                    if (!entry.isDirectory) {
                        val path = entry.name
                        val name = path.substringAfterLast('/')
                        val bytes = zis.readBytes()
                        val content = String(bytes, Charsets.UTF_8)
                        
                        ingestFile(name, path, content)
                        fileCount++
                    }
                    entry = zis.nextEntry
                }
            }
            repository.log("Successfully unpacked ZIP archive containing $fileCount items.", "INFO")
        } catch (e: Exception) {
            repository.log("Error unpacking ZIP archive: ${e.message}", "ERROR")
        }
    }

    /**
     * Classification logic:
     * - [MAIN] for application entry points, core initialization scripts, MainActivity, etc.
     * - [TITLE / METADATA] for configuration, manifests, package contracts, environment (.env, build.gradle, toml).
     * - [SOURCE] for components, business logic, algorithms, screens, databases, etc.
     */
    private fun determineBucket(name: String, path: String, content: String): String {
        val lowercasePath = path.lowercase()
        val lowercaseName = name.lowercase()
        
        return when {
            lowercaseName.contains("mainactivity") || 
            lowercaseName.contains("appentry") || 
            lowercaseName == "index.js" || 
            lowercaseName == "main.kt" -> "MAIN"
            
            lowercaseName.endsWith(".toml") || 
            lowercaseName.endsWith(".pro") || 
            lowercaseName.contains("manifest") || 
            lowercaseName.contains("gradle") || 
            lowercaseName.contains("config") || 
            lowercaseName.contains(".env") || 
            lowercaseName == "package.json" -> "METADATA"
            
            else -> "SOURCE"
        }
    }

    /**
     * Graph indexing: Parses code to extract basic nodes (classes, interfaces, functions, variables)
     * and maps relationships. Returns a searchable summary string.
     */
    fun buildReferenceGraph(files: List<IngressFile>): Map<String, List<String>> {
        val graph = mutableMapOf<String, MutableList<String>>()
        for (file in files) {
            val fileKey = "${file.bucket}:${file.name}"
            val targets = mutableListOf<String>()
            
            // Basic structural scanning
            val lines = file.content.lines()
            for (line in lines) {
                val trimmed = line.trim()
                when {
                    trimmed.startsWith("class ") || trimmed.startsWith("data class ") -> {
                        val className = trimmed.substringAfter("class ").substringBefore("{").substringBefore("(").trim()
                        targets.add("class:$className")
                    }
                    trimmed.startsWith("fun ") -> {
                        val funName = trimmed.substringAfter("fun ").substringBefore("(").trim()
                        targets.add("function:$funName")
                    }
                    trimmed.startsWith("interface ") -> {
                        val interfaceName = trimmed.substringAfter("interface ").substringBefore("{").trim()
                        targets.add("interface:$interfaceName")
                    }
                    trimmed.startsWith("import ") -> {
                        val imp = trimmed.substringAfter("import ").trim()
                        targets.add("import:$imp")
                    }
                }
            }
            graph[fileKey] = targets
        }
        return graph
    }

    /**
     * Utility to extract specific snippets for prompt context injector
     */
    fun findContextSnippets(files: List<IngressFile>, query: String): String {
        val matches = files.filter { 
            it.content.contains(query, ignoreCase = true) || 
            it.name.contains(query, ignoreCase = true) 
        }
        if (matches.isEmpty()) return "No relevant code snippet context found in file sandbox."
        
        return matches.joinToString("\n\n") { file ->
            "--- File: ${file.path} [${file.bucket}] ---\n" + 
            file.content.lines().take(50).joinToString("\n") +
            (if (file.content.lines().size > 50) "\n// ... [truncated for context size]" else "")
        }
    }
}
