const { YoutubeTranscript } = require('youtube-transcript');

async function test() {
    try {
        console.log("Testing with valid video...");
        const transcript = await YoutubeTranscript.fetchTranscript('ScMzIvxBSi4');
        console.log("Success! Characters fetched:", transcript.map(t => t.text).join(" ").length);
    } catch (err) {
        console.error("Direct library failure:", err);
    }
}

test();
