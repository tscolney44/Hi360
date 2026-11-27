package com.hi360.app

import android.app.Application
import android.content.ComponentName
import android.content.Context
import android.os.Bundle
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.setValue
import androidx.core.content.ContextCompat
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.common.MediaItem
import androidx.media3.common.MediaMetadata
import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import androidx.media3.session.MediaController
import androidx.media3.session.SessionToken
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class Hi360ViewModel(app: Application) : AndroidViewModel(app) {
    private val prefs = app.getSharedPreferences("hi360", Context.MODE_PRIVATE)
    private var controller: MediaController? = null
    private val triedByTrack = HashMap<String, MutableSet<String>>()

    var tracks by mutableStateOf<List<HiTrack>>(emptyList()); private set
    var loading by mutableStateOf(false); private set
    var error by mutableStateOf(""); private set
    var notice by mutableStateOf("")
    var stale by mutableStateOf(false); private set
    var endpoint by mutableStateOf(prefs.getString("endpoint", BuildConfig.DEFAULT_API_URL) ?: BuildConfig.DEFAULT_API_URL); private set
    var favourites by mutableStateOf(prefs.getStringSet("favs", emptySet()) ?: emptySet()); private set
    var preferred by mutableStateOf(prefs.getString("quality", "aac256") ?: "aac256"); private set

    // player state mirrored from the MediaController
    var currentId by mutableStateOf<String?>(null); private set
    var currentQuality by mutableStateOf<String?>(null); private set
    var isPlaying by mutableStateOf(false); private set
    var buffering by mutableStateOf(false); private set
    var shuffle by mutableStateOf(false); private set
    var repeatMode by mutableStateOf(Player.REPEAT_MODE_OFF); private set

    val current get() = tracks.firstOrNull { it.id == currentId }
    fun position() = controller?.currentPosition ?: 0L
    fun duration() = controller?.duration?.takeIf { it > 0 } ?: ((current?.durationSec ?: 0) * 1000L)

    init {
        loadCached(); connect()
    }

    private fun connect() {
        val ctx = getApplication<Application>()
        val future = MediaController.Builder(ctx, SessionToken(ctx, ComponentName(ctx, PlaybackService::class.java))).buildAsync()
        future.addListener({
            val c = runCatching { future.get() }.getOrNull() ?: run { notice = "Could not connect to the playback service."; return@addListener }
            controller = c
            c.addListener(object : Player.Listener {
                override fun onEvents(p: Player, e: Player.Events) { sync(p) }
                override fun onPlayerError(error: PlaybackException) { fallBack() }
            })
            sync(c)
        }, ContextCompat.getMainExecutor(ctx))
    }

    private fun sync(p: Player) {
        currentId = p.currentMediaItem?.mediaId
        currentQuality = p.currentMediaItem?.mediaMetadata?.extras?.getString("q")
        isPlaying = p.isPlaying
        buffering = p.playbackState == Player.STATE_BUFFERING
        shuffle = p.shuffleModeEnabled
        repeatMode = p.repeatMode
    }

    // ---- catalogue ---------------------------------------------------------
    private fun loadCached() {
        prefs.getString("catalogue", null)?.let { raw -> runCatching { CatalogueParser.parse(raw) }.onSuccess { tracks = it; stale = true } }
    }
    private var refreshing = false
    /** silent = background live-sync: no spinner, and a failure keeps the current list. */
    fun refresh(silent: Boolean = false) {
        if (refreshing) return
        refreshing = true
        viewModelScope.launch {
            if (!silent || tracks.isEmpty()) { loading = true; error = "" }
            try {
                val raw = withContext(Dispatchers.IO) { CatalogueApi(endpoint).readRaw() }
                val parsed = withContext(Dispatchers.Default) { CatalogueParser.parse(raw) }
                val added = if (tracks.isNotEmpty()) parsed.size - tracks.size else 0
                tracks = parsed; stale = false; error = ""
                if (silent && added > 0) notice = "$added new track(s) added"
                prefs.edit().putString("catalogue", raw).apply()
            } catch (e: Exception) {
                if (!silent || tracks.isEmpty()) error = if (tracks.isEmpty()) (e.message ?: "Could not load catalogue") else "Offline — showing your last saved catalogue."
            }
            loading = false; refreshing = false
        }
    }
    fun setEndpoint(v: String) { endpoint = v.trim(); prefs.edit().putString("endpoint", endpoint).apply(); refresh() }
    fun toggleFav(id: String) { favourites = if (id in favourites) favourites - id else favourites + id; prefs.edit().putStringSet("favs", favourites).apply() }

    // ---- playback ----------------------------------------------------------
    private fun item(t: HiTrack, q: String) = MediaItem.Builder().setMediaId(t.id).setUri(t.qualities.getValue(q))
        .setMediaMetadata(MediaMetadata.Builder().setTitle(t.title).setArtist(t.displayArtist).setAlbumTitle(t.album)
            .setArtworkUri(t.cover.takeIf { it.isNotEmpty() }?.let { android.net.Uri.parse(it) })
            .setExtras(Bundle().apply { putString("q", q) }).build()).build()

    fun play(list: List<HiTrack>, index: Int) {
        val c = controller ?: return
        val items = list.mapNotNull { t -> Tiers.pick(t, preferred)?.let { item(t, it) } }
        val start = items.indexOfFirst { it.mediaId == list[index].id }.coerceAtLeast(0)
        triedByTrack.clear()
        c.setMediaItems(items, start, 0L); c.prepare(); c.play()
    }
    fun toggle() { controller?.let { if (it.isPlaying) it.pause() else it.play() } }
    fun next() { controller?.seekToNextMediaItem() }
    fun prev() { controller?.let { if (it.currentPosition > 3000 || !it.hasPreviousMediaItem()) it.seekTo(0) else it.seekToPreviousMediaItem() } }
    fun seek(ms: Long) { controller?.seekTo(ms) }
    fun toggleShuffle() { controller?.let { it.shuffleModeEnabled = !it.shuffleModeEnabled } }
    fun cycleRepeat() { controller?.let { it.repeatMode = when (it.repeatMode) { Player.REPEAT_MODE_OFF -> Player.REPEAT_MODE_ALL; Player.REPEAT_MODE_ALL -> Player.REPEAT_MODE_ONE; else -> Player.REPEAT_MODE_OFF } } }

    /**
     * Re-points the current queue entry at another quality tier, keeping position and the rest of the queue.
     * This re-prepares the player (a brief gap is expected); it is NOT gapless.
     */
    fun switchQuality(q: String) {
        val c = controller ?: return; val t = current ?: return
        if (!t.qualities.containsKey(q)) return
        preferred = q; prefs.edit().putString("quality", q).apply()
        replaceCurrent(c, t, q)
    }
    fun switchQualityPreference(q: String) { preferred = q; prefs.edit().putString("quality", q).apply() }
    private fun replaceCurrent(c: MediaController, t: HiTrack, q: String) {
        val pos = c.currentPosition; val idx = c.currentMediaItemIndex; val wasPlaying = c.playWhenReady
        val items = (0 until c.mediaItemCount).map { i -> if (i == idx) item(t, q) else c.getMediaItemAt(i) }
        c.setMediaItems(items, idx, pos); c.prepare(); c.playWhenReady = wasPlaying
    }
    private fun fallBack() {
        val c = controller ?: return; val t = current ?: return
        val failed = currentQuality
        val tried = triedByTrack.getOrPut(t.id) { mutableSetOf() }; failed?.let { tried += it }
        val want = failed ?: preferred
        val alt = Tiers.order.filter { t.qualities.containsKey(it) && it !in tried }
            .minByOrNull { Math.abs(Tiers.order.indexOf(it) - Tiers.order.indexOf(want)) }
        if (alt == null) { notice = "This track couldn't be played (link expired, unsupported format or no connection)."; return }
        notice = "${failed?.let { Tiers.label(it) } ?: "Source"} failed — continuing on ${Tiers.label(alt)}."
        replaceCurrent(c, t, alt)
    }

    override fun onCleared() { controller?.release(); super.onCleared() }
}
