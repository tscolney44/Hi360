package com.hi360.app

import android.Manifest
import android.content.pm.ActivityInfo
import android.os.Build
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.activity.viewModels
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
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.media3.common.Player
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.platform.LocalConfiguration
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import coil.compose.AsyncImage
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

private val Ink = Color(0xFF09090E)
private val Panel = Color(0xFF17141E)
private val Accent = Color(0xFFD8C2F4)

class MainActivity : ComponentActivity() {
    private val vm: Hi360ViewModel by viewModels()
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        // phones: portrait only; tablets (smallest width >= 600dp): free rotation incl. landscape
        requestedOrientation = if (resources.configuration.smallestScreenWidthDp < 600) ActivityInfo.SCREEN_ORIENTATION_PORTRAIT else ActivityInfo.SCREEN_ORIENTATION_FULL_SENSOR
        // live sync: refresh on every resume and every 30 s while the app is visible, so new sheet rows appear without a manual refresh
        lifecycleScope.launch { repeatOnLifecycle(Lifecycle.State.STARTED) { while (true) { vm.refresh(silent = true); delay(30_000) } } }
        setContent { Hi360Screen(vm) }
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
private fun Hi360Screen(vm: Hi360ViewModel) {
    var query by remember { mutableStateOf("") }
    var tab by remember { mutableStateOf(0) }
    var showSettings by remember { mutableStateOf(false) }
    val snack = remember { SnackbarHostState() }
    val wide = LocalConfiguration.current.screenWidthDp >= 720   // tablets: two-pane layout
    val notifPermission = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { }
    LaunchedEffect(Unit) { if (Build.VERSION.SDK_INT >= 33) notifPermission.launch(Manifest.permission.POST_NOTIFICATIONS) }
    LaunchedEffect(vm.notice) { if (vm.notice.isNotBlank()) { snack.showSnackbar(vm.notice); vm.notice = "" } }

    val visible = remember(vm.tracks, query, tab, vm.favourites) {
        val q = query.trim().lowercase()
        vm.tracks.filter { t -> (tab == 0 || t.id in vm.favourites) && (q.isEmpty() || listOf(t.title, t.artist, t.featured, t.album, t.genre, t.year.toString()).joinToString(" ").lowercase().contains(q)) }
    }

    MaterialTheme(colorScheme = darkColorScheme(background = Ink, surface = Panel, primary = Accent)) {
        Scaffold(containerColor = Ink, snackbarHost = { SnackbarHost(snack) }, bottomBar = { if (!wide) vm.current?.let { NowPlaying(vm, it) } }) { pad ->
            Row(Modifier.fillMaxSize().padding(pad)) {
            Column(Modifier.weight(1f).fillMaxHeight().padding(horizontal = 18.dp)) {
                Row(Modifier.fillMaxWidth().padding(top = 18.dp, bottom = 8.dp), verticalAlignment = Alignment.CenterVertically) {
                    Text("Hi360", style = MaterialTheme.typography.headlineMedium, fontWeight = FontWeight.Black, modifier = Modifier.weight(1f))
                    IconButton(onClick = { vm.refresh() }) { Icon(Icons.Default.Refresh, "Refresh catalogue") }
                    IconButton(onClick = { showSettings = true }) { Icon(Icons.Default.Settings, "Settings") }
                }
                OutlinedTextField(query, { query = it }, singleLine = true, label = { Text("Search title, artist, album, genre") }, modifier = Modifier.fillMaxWidth(),
                    trailingIcon = { if (query.isNotEmpty()) IconButton(onClick = { query = "" }) { Icon(Icons.Default.Close, "Clear search") } })
                TabRow(selectedTabIndex = tab, containerColor = Ink, contentColor = Accent) {
                    Tab(tab == 0, { tab = 0 }, text = { Text("All tracks") }); Tab(tab == 1, { tab = 1 }, text = { Text("Favourites") })
                }
                if (vm.loading) LinearProgressIndicator(Modifier.fillMaxWidth())
                if (vm.error.isNotBlank()) Text(vm.error, color = Color(0xFFFF9BAA), modifier = Modifier.padding(8.dp))
                if (vm.stale && vm.error.isBlank()) Text("Showing last saved catalogue", color = Color.LightGray, style = MaterialTheme.typography.labelSmall)
                LazyColumn(verticalArrangement = Arrangement.spacedBy(8.dp), modifier = Modifier.padding(top = 10.dp)) {
                    items(visible, key = { it.id }) { t ->
                        Row(Modifier.fillMaxWidth().background(if (t.id == vm.currentId) Color(0xFF241E2E) else Panel, RoundedCornerShape(12.dp))
                            .clickable { vm.play(visible, visible.indexOf(t)) }.padding(10.dp), verticalAlignment = Alignment.CenterVertically) {
                            AsyncImage(model = t.cover.ifEmpty { null }, contentDescription = null, modifier = Modifier.size(54.dp))
                            Spacer(Modifier.width(12.dp))
                            Column(Modifier.weight(1f)) {
                                Text(t.title, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                                Text(t.displayArtist + if (t.album.isNotBlank()) " · ${t.album}" else "", color = Color.LightGray, style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
                            }
                            IconButton(onClick = { vm.toggleFav(t.id) }) {
                                Icon(if (t.id in vm.favourites) Icons.Default.Favorite else Icons.Default.FavoriteBorder, if (t.id in vm.favourites) "Remove from favourites" else "Add to favourites", tint = Accent)
                            }
                        }
                    }
                    if (visible.isEmpty() && !vm.loading) item {
                        Column(Modifier.fillMaxWidth().padding(40.dp), horizontalAlignment = Alignment.CenterHorizontally) {
                            Text(if (vm.tracks.isEmpty()) "No catalogue loaded" else "Nothing matches", color = Color.White)
                            if (vm.tracks.isEmpty()) Text("Set your Hi360 API URL in Settings, then refresh.", color = Color.LightGray, style = MaterialTheme.typography.bodySmall)
                        }
                    }
                }
            }
            if (wide) vm.current?.let { SidePanel(vm, it) }
            }
        }
        if (showSettings) SettingsDialog(vm) { showSettings = false }
    }
}

@Composable
private fun SidePanel(vm: Hi360ViewModel, t: HiTrack) {
    Column(Modifier.width(360.dp).fillMaxHeight().background(Panel), verticalArrangement = Arrangement.Bottom) {
        AsyncImage(model = t.cover.ifEmpty { null }, contentDescription = null, contentScale = ContentScale.Crop,
            modifier = Modifier.fillMaxWidth().padding(20.dp).aspectRatio(1f))
        Spacer(Modifier.weight(1f))
        NowPlaying(vm, t)
    }
}

@Composable
private fun SettingsDialog(vm: Hi360ViewModel, onClose: () -> Unit) {
    var url by remember { mutableStateOf(vm.endpoint) }
    AlertDialog(onDismissRequest = onClose,
        title = { Text("Settings") },
        text = {
            Column(verticalArrangement = Arrangement.spacedBy(10.dp)) {
                OutlinedTextField(url, { url = it }, label = { Text("Hi360 API URL") }, singleLine = true, modifier = Modifier.fillMaxWidth())
                Text("Your deployed HTTPS /api/catalogue address. The Deltabase token stays on the server.", style = MaterialTheme.typography.bodySmall, color = Color.LightGray)
                Text("Preferred quality", style = MaterialTheme.typography.labelMedium)
                Tiers.order.forEach { k -> Row(Modifier.fillMaxWidth().clickable { vm.switchQualityPreference(k) }, verticalAlignment = Alignment.CenterVertically) { RadioButton(vm.preferred == k, { vm.switchQualityPreference(k) }); Text(Tiers.label(k)) } }
                Text("Downloads, offline library and exclusive/bit-perfect output are not part of this build.", style = MaterialTheme.typography.bodySmall, color = Color.LightGray)
            }
        },
        confirmButton = { TextButton(onClick = { vm.updateEndpoint(url); onClose() }) { Text("Save and connect") } },
        dismissButton = { TextButton(onClick = onClose) { Text("Cancel") } })
}

@Composable
private fun NowPlaying(vm: Hi360ViewModel, t: HiTrack) {
    var pos by remember { mutableStateOf(0L) }
    var dragging by remember { mutableStateOf(false) }
    var drag by remember { mutableStateOf(0f) }
    LaunchedEffect(vm.currentId, vm.isPlaying) { while (true) { if (!dragging) pos = vm.position(); delay(500) } }
    val dur = vm.duration().coerceAtLeast(1L)
    Column(Modifier.fillMaxWidth().background(Panel).padding(horizontal = 12.dp, vertical = 8.dp)) {
        Row(verticalAlignment = Alignment.CenterVertically) {
            AsyncImage(model = t.cover.ifEmpty { null }, contentDescription = null, modifier = Modifier.size(46.dp))
            Spacer(Modifier.width(10.dp))
            Column(Modifier.weight(1f)) {
                Text(t.title, fontWeight = FontWeight.Bold, maxLines = 1, overflow = TextOverflow.Ellipsis)
                Text(if (vm.buffering) "Buffering…" else t.displayArtist, color = Color.LightGray, style = MaterialTheme.typography.bodySmall, maxLines = 1, overflow = TextOverflow.Ellipsis)
            }
            QualityMenu(vm, t)
        }
        Slider(value = if (dragging) drag else pos.toFloat() / dur, onValueChange = { dragging = true; drag = it }, onValueChangeFinished = { vm.seek((drag * dur).toLong()); pos = (drag * dur).toLong(); dragging = false })
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceEvenly, verticalAlignment = Alignment.CenterVertically) {
            IconButton(onClick = { vm.toggleShuffle() }) { Icon(Icons.Default.Shuffle, "Shuffle", tint = if (vm.shuffle) Accent else Color.Gray) }
            IconButton(onClick = { vm.prev() }) { Icon(Icons.Default.SkipPrevious, "Previous") }
            FilledIconButton(onClick = { vm.toggle() }) { Icon(if (vm.isPlaying) Icons.Default.Pause else Icons.Default.PlayArrow, if (vm.isPlaying) "Pause" else "Play") }
            IconButton(onClick = { vm.next() }) { Icon(Icons.Default.SkipNext, "Next") }
            IconButton(onClick = { vm.cycleRepeat() }) {
                Icon(if (vm.repeatMode == Player.REPEAT_MODE_ONE) Icons.Default.RepeatOne else Icons.Default.Repeat, "Repeat", tint = if (vm.repeatMode == Player.REPEAT_MODE_OFF) Color.Gray else Accent)
            }
        }
    }
}

@Composable
private fun QualityMenu(vm: Hi360ViewModel, t: HiTrack) {
    var open by remember { mutableStateOf(false) }
    Box {
        TextButton(onClick = { open = true }) { Text(vm.currentQuality?.let { Tiers.label(it) } ?: "Quality") }
        DropdownMenu(open, { open = false }) {
            Tiers.order.filter { t.qualities.containsKey(it) }.forEach { k -> DropdownMenuItem(text = { Text(Tiers.label(k)) }, onClick = { open = false; vm.switchQuality(k) }) }
        }
    }
}
