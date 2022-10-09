self.properties({
    render() {
    },
    connected() {
        this.style.display = "block";
        this.style.maxWidth = "98%";
        const root = this.shadowRoot,
            notation = document.createElement("div"),
            midi = document.createElement("div");
        notation.style.scale = "95%";
        //notation.style.border = "grey 1px dotted";
        midi.innerHTML =
            `<p id="suspend-explanation" style="display:none">Browsers won't allow audio to work unless the audio is started in response to
            a user action. This prevents auto-playing web sites. Therefore, the following button is needed to do the initialization:</p>
        <div class="row">
            <div id="buttons" style="margin-left:2ch;margin-bottom:1em">
            <button id="activate-audio">Play</button>
            <button id="stop-audio" style="display:none;">Stop Audio</button>
            </div>
         <div id="audio-error" style="display:none;">Audio is not supported in this browser.</div>
        <div id="status" style="display:none"></div>
        </div>`;
        root.appendChild(notation);
        root.appendChild(midi);
        const startAudioButton = root.getElementById("activate-audio"),
            stopAudioButton = root.getElementById("stop-audio"),
            explanationDiv = root.getElementById("suspend-explanation"),
            audioError = root.getElementById("audio-error"),
            statusDiv = root.getElementById("status"),
            buttons = root.getElementById("buttons");
        let midiBuffer,
            visualObj;
        this.render = function () {
            const abc = this.innerHTML.trim().replace("&nbsp;", "").replaceAll("\<br\>","\n") || "X\nT: My Music",
                title = (abc.match(/T:\s?(.+).*/) || [])[1];
            this.setAttribute("title", title || "Untitled Sheet Music");
            //this.classList.remove("optioneditable-block");
            visualObj = ABCJS.renderAbc(notation, abc)[0];
            if (abc.includes("|:")) {
                buttons.style.display = "";
            } else {
                buttons.style.display = "none";
            }
            const svg = notation.firstElementChild;
            svg.style.scale = "90%";
            svg.style.position = "relative";
            svg.style.left = "-50px";
        }

        startAudioButton.addEventListener("click", function () {
            startAudioButton.setAttribute("style", "display:none;");
            // explanationDiv.setAttribute("style", "opacity: 0;");
            statusDiv.innerHTML = "<div>Testing browser</div>";
            if (ABCJS.synth.supportsAudio()) {
                stopAudioButton.setAttribute("style", "");

                // An audio context is needed - this can be passed in for two reasons:
                // 1) So that you can share this audio context with other elements on your page.
                // 2) So that you can create it during a user interaction so that the browser doesn't block the sound.
                // Setting this is optional - if you don't set an audioContext, then abcjs will create one.
                window.AudioContext = window.AudioContext ||
                    window.webkitAudioContext ||
                    navigator.mozAudioContext ||
                    navigator.msAudioContext;
                const audioContext = new window.AudioContext();
                audioContext.resume().then(function () {
                    statusDiv.innerHTML += "<div>AudioContext resumed</div>";
                    // In theory the AC shouldn't start suspended because it is being initialized in a click handler, but iOS seems to anyway.

                    // This does a bare minimum so this object could be created in advance, or whenever convenient.
                    midiBuffer = new ABCJS.synth.CreateSynth();

                    // midiBuffer.init preloads and caches all the notes needed. There may be significant network traffic here.
                    return midiBuffer.init({
                        visualObj: visualObj,
                        audioContext: audioContext,
                        millisecondsPerMeasure: visualObj.millisecondsPerMeasure()
                    }).then(function (response) {
                        //console.log("Notes loaded: ", response)
                        statusDiv.innerHTML += "<div>Audio object has been initialized</div>";
                        // console.log(response); // this contains the list of notes that were loaded.
                        // midiBuffer.prime actually builds the output buffer.
                        return midiBuffer.prime();
                    }).then(function (response) {
                        statusDiv.innerHTML += "<div>Audio object has been primed (" + response.duration + " seconds).</div>";
                        statusDiv.innerHTML += "<div>status = " + response.status + "</div>"
                        // At this point, everything slow has happened. midiBuffer.start will return very quickly and will start playing very quickly without lag.
                        midiBuffer.start();
                        statusDiv.innerHTML += "<div>Audio started</div>";
                        return Promise.resolve();
                    }).catch(function (error) {
                        if (error.status === "NotSupported") {
                            stopAudioButton.setAttribute("style", "display:none;");
                            audioError.setAttribute("style", "");
                        } else
                            console.warn("synth error", error);
                    });
                });
            } else {
                audioError.setAttribute("style", "");
            }
        });
        stopAudioButton.addEventListener("click", function () {
            startAudioButton.setAttribute("style", "");
            //explanationDiv.setAttribute("style", "");
            stopAudioButton.setAttribute("style", "display:none;");
            if (midiBuffer)
                midiBuffer.stop();
        });
    }
})


