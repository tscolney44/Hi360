package com.hi360.stream

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.CircleShape
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Brush
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent { Hi360Theme { Hi360App() } }
    }
}

private val Ink = Color(0xFF090A0F)
private val Surface = Color(0xFF15161E)
private val Violet = Color(0xFF9C7CFF)
private val Mint = Color(0xFF78E6CB)

@Composable
fun Hi360Theme(content: @Composable () -> Unit) = MaterialTheme(
    colorScheme = darkColorScheme(primary = Violet, secondary = Mint, background = Ink, surface = Surface), content = content
)

@Composable
fun Hi360App() {
    var quality by remember { mutableStateOf(StreamQuality("Hi-Res Lossless", 192000, 24)) }
    var playing by remember { mutableStateOf(false) }
    var showQuality by remember { mutableStateOf(false) }
    val albums = listOf("Afterlight" to Color(0xFF5B3A82), "Tidal Motion" to Color(0xFF155E75), "Neon Fields" to Color(0xFF973B5B))

    Scaffold(containerColor = Ink, bottomBar = { PlayerBar(playing, { playing = !playing }, quality) }) { padding ->
        Column(Modifier.fillMaxSize().padding(padding).padding(horizontal = 20.dp)) {
            Spacer(Modifier.height(20.dp))
            Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                Column(Modifier.weight(1f)) {
                    Text("Good evening", color = Color(0xFF9B9CA7), fontSize = 15.sp)
                    Text("Discover in full resolution", fontWeight = FontWeight.Bold, fontSize = 25.sp)
                }
                Box(Modifier.size(42.dp).clip(CircleShape).background(Surface), contentAlignment = Alignment.Center) {
                    Icon(Icons.Default.Person, null, tint = Color.White)
                }
            }
            Spacer(Modifier.height(28.dp))
            ElevatedCard(colors = CardDefaults.elevatedCardColors(containerColor = Color(0xFF201D35)), shape = RoundedCornerShape(22.dp)) {
                Row(Modifier.padding(20.dp), verticalAlignment = Alignment.CenterVertically) {
                    Box(Modifier.size(54.dp).clip(RoundedCornerShape(16.dp)).background(Brush.linearGradient(listOf(Violet, Mint)))) {
                        Icon(Icons.Default.GraphicEq, null, tint = Ink, modifier = Modifier.align(Alignment.Center).size(30.dp))
                    }
                    Spacer(Modifier.width(16.dp))
                    Column(Modifier.weight(1f)) {
                        Text("Your sound, uncompressed", fontWeight = FontWeight.Bold, fontSize = 17.sp)
                        Text("Hear every detail with Hi-Res streaming.", color = Color(0xFFBBB5D4), fontSize = 13.sp)
                    }
                }
            }
            Spacer(Modifier.height(28.dp))
            SectionHeader("Made for you", "See all")
            Spacer(Modifier.height(14.dp))
            LazyRow(horizontalArrangement = Arrangement.spacedBy(14.dp)) {
                items(albums) { (title, color) -> AlbumCard(title, color) }
            }
            Spacer(Modifier.height(28.dp))
            SectionHeader("Streaming quality", "")
            Spacer(Modifier.height(12.dp))
            QualityCard(quality, onClick = { showQuality = true })
            Spacer(Modifier.height(26.dp))
            Text("Recently played", fontWeight = FontWeight.Bold, fontSize = 20.sp)
            Spacer(Modifier.height(12.dp))
            TrackRow("Cloudline", "Luna Mori", "4:12", Icons.Default.MoreHoriz)
            TrackRow("Future Memory", "VALE", "3:46", Icons.Default.MoreHoriz)
        }
    }
    if (showQuality) QualitySheet(quality, { request -> quality = AudioEngine.negotiate(request); showQuality = false }, { showQuality = false })
}

@Composable private fun SectionHeader(title: String, action: String) = Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) {
    Text(title, fontWeight = FontWeight.Bold, fontSize = 20.sp, modifier = Modifier.weight(1f)); if (action.isNotBlank()) Text(action, color = Violet, fontSize = 14.sp)
}

@Composable private fun AlbumCard(title: String, color: Color) = Column(Modifier.width(142.dp)) {
    Box(Modifier.size(142.dp).clip(RoundedCornerShape(18.dp)).background(Brush.linearGradient(listOf(color, Ink))), contentAlignment = Alignment.Center) {
        Icon(Icons.Default.Album, null, tint = Color.White.copy(alpha = .85f), modifier = Modifier.size(54.dp))
    }
    Spacer(Modifier.height(9.dp)); Text(title, fontWeight = FontWeight.SemiBold, maxLines = 1, overflow = TextOverflow.Ellipsis); Text("hi360 mix", color = Color(0xFF9899A4), fontSize = 13.sp)
}

@Composable private fun QualityCard(quality: StreamQuality, onClick: () -> Unit) = Card(Modifier.fillMaxWidth().clickable(onClick = onClick), colors = CardDefaults.cardColors(containerColor = Surface), shape = RoundedCornerShape(18.dp)) {
    Row(Modifier.padding(17.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(42.dp).clip(CircleShape).background(Violet.copy(alpha = .18f)), contentAlignment = Alignment.Center) { Icon(Icons.Default.HighQuality, null, tint = Violet) }
        Spacer(Modifier.width(13.dp)); Column(Modifier.weight(1f)) { Text(quality.label, fontWeight = FontWeight.Bold); Text(quality.detail + " • FLAC", color = Color(0xFF9B9CA7), fontSize = 13.sp) }
        Icon(Icons.Default.ChevronRight, null, tint = Color(0xFFB6B4BF))
    }
}

@Composable private fun TrackRow(title: String, artist: String, duration: String, icon: ImageVector) = Row(Modifier.fillMaxWidth().padding(vertical = 9.dp), verticalAlignment = Alignment.CenterVertically) {
    Box(Modifier.size(48.dp).clip(RoundedCornerShape(12.dp)).background(Color(0xFF292A36)), contentAlignment = Alignment.Center) { Icon(Icons.Default.MusicNote, null, tint = Mint) }
    Spacer(Modifier.width(12.dp)); Column(Modifier.weight(1f)) { Text(title, fontWeight = FontWeight.SemiBold); Text(artist, color = Color(0xFF9899A4), fontSize = 13.sp) }; Text(duration, color = Color(0xFF9899A4), fontSize = 13.sp); Icon(icon, null, tint = Color.White, modifier = Modifier.padding(start = 8.dp))
}

@Composable private fun PlayerBar(playing: Boolean, toggle: () -> Unit, quality: StreamQuality) = Surface(color = Color(0xFF101117), tonalElevation = 8.dp) {
    Row(Modifier.fillMaxWidth().padding(horizontal = 16.dp, vertical = 11.dp), verticalAlignment = Alignment.CenterVertically) {
        Box(Modifier.size(43.dp).clip(RoundedCornerShape(10.dp)).background(Brush.linearGradient(listOf(Violet, Mint))))
        Spacer(Modifier.width(11.dp)); Column(Modifier.weight(1f)) { Text("Cloudline", fontWeight = FontWeight.Bold); Text(quality.detail, color = Mint, fontSize = 12.sp) }
        IconButton(toggle) { Icon(if (playing) Icons.Default.PauseCircle else Icons.Default.PlayCircle, if (playing) "Pause" else "Play", tint = Color.White, modifier = Modifier.size(35.dp)) }
    }
}

@Composable private fun QualitySheet(current: StreamQuality, select: (StreamQuality) -> Unit, dismiss: () -> Unit) {
    val choices = listOf(StreamQuality("Standard", 48000, 16), StreamQuality("Lossless", 96000, 24), StreamQuality("Hi-Res Lossless", 192000, 24))
    ModalBottomSheet(onDismissRequest = dismiss, containerColor = Surface) { Column(Modifier.padding(horizontal = 24.dp).padding(bottom = 32.dp)) {
        Text("Streaming quality", fontWeight = FontWeight.Bold, fontSize = 23.sp); Text("The native audio pipeline will choose the best format your device supports.", color = Color(0xFFAAABB5), fontSize = 14.sp, modifier = Modifier.padding(top = 5.dp, bottom = 16.dp))
        choices.forEach { choice -> Row(Modifier.fillMaxWidth().clickable { select(choice) }.padding(vertical = 15.dp), verticalAlignment = Alignment.CenterVertically) { RadioButton(selected = choice == current, onClick = { select(choice) }); Spacer(Modifier.width(10.dp)); Column { Text(choice.label, fontWeight = FontWeight.SemiBold); Text(choice.detail + if (choice.bitDepth == 24) " • FLAC" else " • AAC", color = Color(0xFFA5A6AF), fontSize = 13.sp) } } }
    } }
}
