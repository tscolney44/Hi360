package com.hi360.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer
import coil.compose.AsyncImage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

private val Ink = Color(0xFF09090E)
private val Panel = Color(0xFF17141E)
private val Accent = Color(0xFFD8C2F4)

class MainActivity : ComponentActivity() {
    private lateinit var player: ExoPlayer
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        player = ExoPlayer.Builder(this).build()
        setContent { Hi360Screen(player) }
    }
    override fun onStop() { super.onStop(); player.pause() }
    override fun onDestroy() { player.release(); super.onDestroy() }
}

@Composable
private fun Hi360Screen(player: ExoPlayer) {
    val scope = rememberCoroutineScope()
    var endpoint by remember { mutableStateOf("https://YOUR-HI360-DOMAIN/api/catalogue") }
    var tracks by remember { mutableStateOf<List<HiTrack>>(emptyList()) }
    var current by remember { mutableStateOf<HiTrack?>(null) }
    var playing by remember { mutableStateOf(false) }
    var error by remember { mutableStateOf("") }
    var busy by remember { mutableStateOf(false) }
    var quality by remember { mutableStateOf("aac256") }
    var showSettings by remember { mutableStateOf(false) }
    fun refresh() {
        scope.launch {
            busy = true; error = ""
            try { tracks = withContext(Dispatchers.IO) { CatalogueApi(endpoint).read() } }
            catch (e: Exception) { error = e.message ?: "Could not load catalogue" }
            busy = false
        }
    }
    MaterialTheme(colorScheme = darkColorScheme(background = Ink, surface = Panel, primary = Accent)) {
        Scaffold(containerColor = Ink, bottomBar = {
            current?.let { t ->
                Column(Modifier.fillMaxWidth().background(Panel).padding(12.dp)) {
                    Row(verticalAlignment = Alignment.CenterVertically) {
                        AsyncImage(model = t.cover, contentDescription = null, modifier = Modifier.size(48.dp))
                        Spacer(Modifier.width(12.dp))
                        Column(Modifier.weight(1f)) { Text(t.title, fontWeight = FontWeight.Bold); Text(t.artist, color = Color.LightGray, style = MaterialTheme.typography.bodySmall) }
                        IconButton(onClick = { if (player.isPlaying) { player.pause(); playing = false } else { player.play(); playing = true } }) {
                            Icon(if (playing) Icons.Default.Pause else Icons.Default.PlayArrow, null, tint = Accent)
                        }
                    }
                    val choices = t.qualities.filterValues { it.isNotBlank() }
                    if (choices.isNotEmpty()) {
                        var expanded by remember { mutableStateOf(false) }
                        Box {
                            TextButton(onClick = { expanded = true }) { Text(choices[quality]?.let { label(quality) } ?: "Choose quality") }
                            DropdownMenu(expanded = expanded, onDismissRequest = { expanded = false }) {
                                choices.keys.forEach { key -> DropdownMenuItem(text = { Text(label(key)) }, onClick = {
                                    val pos = player.currentPosition
                                    quality = key
                                    player.setMediaItem(MediaItem.fromUri(choices.getValue(key)), pos)
                                    player.prepare(); player.play(); playing = true; expanded = false
                                }) }
                            }
                        }
                    }
                }
            }
        }) { pad ->
            Column(Modifier.fillMaxSize().padding(pad).padding(horizontal = 18.dp)) {
                Row(Modifier.fillMaxWidth().padding(vertical = 22.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("hi360", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black, modifier = Modifier.weight(1f))
                    IconButton(onClick = { showSettings = !showSettings }) { Icon(Icons.Default.Settings, "Settings") }
                    IconButton(onClick = { refresh() }) { Icon(Icons.Default.Refresh, "Refresh") }
                }
                Text("YOUR MUSIC, IN EVERY DETAIL", color = Accent, style = MaterialTheme.typography.labelSmall)
                Text("Your collection", style = MaterialTheme.typography.headlineSmall, modifier = Modifier.padding(top = 8.dp, bottom = 12.dp))
                if (showSettings) {
                    OutlinedTextField(endpoint, { endpoint = it }, label = { Text("Hi360 API URL") }, modifier = Modifier.fillMaxWidth())
                    Text("Use your deployed Hi360 Vercel or Netlify /api/catalogue address.", color = Color.LightGray, style = MaterialTheme.typography.bodySmall)
                    Button(onClick = { refresh(); showSettings = false }) { Text("Save and connect") }
                }
                if (error.isNotBlank()) Text(error, color = Color(0xFFFF9BAA), modifier = Modifier.padding(8.dp))
                if (busy) LinearProgressIndicator(Modifier.fillMaxWidth())
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    items(tracks) { track ->
                        Row(Modifier.fillMaxWidth().background(Panel, RoundedCornerShape(12.dp)).clickable {
                            current = track
                            quality = track.qualities.keys.firstOrNull() ?: "aac256"
                            val url = track.qualities[quality]
                            if (url != null) { player.setMediaItem(MediaItem.fromUri(url)); player.prepare(); player.play(); playing = true }
                        }.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                            AsyncImage(model = track.cover, contentDescription = null, modifier = Modifier.size(54.dp))
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) { Text(track.title, fontWeight = FontWeight.SemiBold); Text(track.artist, color = Color.LightGray, style = MaterialTheme.typography.bodySmall) }
                            Icon(Icons.Default.PlayCircle, null, tint = Accent)
                        }
                    }
                }
                if (tracks.isEmpty() && !busy) Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally) {
                        Text("Connect your Hi360 catalogue", color = Color.White)
                        Text("Set your deployed /api/catalogue URL in Settings.", color = Color.LightGray)
                        Button(onClick = { refresh() }) { Text("Load music") }
                    }
                }
            }
        }
    }
}

private fun label(key: String) = when (key) { "aac96" -> "AAC · 96 kbps"; "aac256" -> "AAC · 256 kbps"; "flac16" -> "FLAC · 16-bit CD"; "flac24" -> "FLAC · 24-bit Hi-Res"; else -> key }
