// legacy syntax for IE support

var supportedPlatforms = ['Chrome', 'Firefox'];
if (supportedPlatforms.indexOf(platform.name) == -1) {
    try {
        document.documentElement.innerHTML = "<center><h1> You browser detected as " + platform.name +
        ". This tool not supports it. Please use latest version Google Chrome or Mozilla Firefox.</h1></center>";
        window.stop();
    }
    catch (err) {
        document.execCommand('Stop');
    }
}
