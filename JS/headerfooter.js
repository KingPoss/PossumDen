// Wait until the DOM is fully loaded
document.addEventListener("DOMContentLoaded", function() {
// Define your header HTML as a template string.
var headerHTML = `

<pre class="header">
88888888888 888    888 8888888888      8888888b.   .d88888b.   .d8888b.   .d8888b.  888     888 888b     d888      8888888b.  8888888888 888b    888
    888     888    888 888             888   Y88b d88P" "Y88b d88P  Y88b d88P  Y88b 888     888 8888b   d8888      888  "Y88b 888        8888b   888
    888     888    888 888             888    888 888     888 Y88b.      Y88b.      888     888 88888b.d88888      888    888 888        88888b  888
    888     8888888888 8888888         888   d88P 888     888  "Y888b.    "Y888b.   888     888 888Y88888P888      888    888 8888888    888Y88b 888
    888     888    888 888             8888888P"  888     888     "Y88b.     "Y88b. 888     888 888 Y888P 888      888    888 888        888 Y88b888
    888     888    888 888             888        888     888       "888       "888 888     888 888  Y8P  888      888    888 888        888  Y88888
    888     888    888 888             888        Y88b. .d88P Y88b  d88P Y88b  d88P Y88b. .d88P 888   "   888      888  .d88P 888        888   Y8888
    888     888    888 8888888888      888         "Y88888P"   "Y8888P"   "Y8888P"   "Y88888P"  888       888      8888888P"  8888888888 888    Y888</pre>

<!-- Start of navigation buttons -->
<nav class="buttons">

<a href="/index.html">
<img onmouseover="this.src='/assets/homed.gif'" onmouseout="this.src='/assets/home.gif'" src="/assets/home.gif" alt="Home">
</a>

<a href="/about.html">
<img onmouseover="this.src='/assets/aboutmed.gif'" onmouseout="this.src='/assets/aboutme.gif'" src="/assets/aboutme.gif" alt="About Me">
</a>

<a href="/art.html">
<img onmouseover="this.src='/assets/artd.gif'" onmouseout="this.src='/assets/art.gif'" src="/assets/art.gif" alt="Art">
</a>

<a href="/Thoughts/MainBlogPage.html">
<img onmouseover="this.src='/assets/thoughtsd.gif'" onmouseout="this.src='/assets/thoughts.gif'" src="/assets/thoughts.gif" alt="Thoughts">
</a>

<a href="/radio.html">
<img onmouseover="this.src='/assets/radiod.gif'" onmouseout="this.src='/assets/radio.gif'" src="/assets/radio.gif" alt="Radio">
</a>

<a href="/projects/projects.html">
<img onmouseover="this.src='/assets/projectsd.gif'" onmouseout="this.src='/assets/projects.gif'" src="/assets/projects.gif" alt="Projects">
</a>

<a href="/programs.html">
<img onmouseover="this.src='/assets/programsd.gif'" onmouseout="this.src='/assets/programs.gif'" src="/assets/programs.gif" alt="Programs">
</a>

<a href="/sites.html">
<img onmouseover="this.src='/assets/coolsitesd.gif'" onmouseout="this.src='/assets/coolsites.gif'" src="/assets/coolsites.gif" alt="Cool Sites">
</a>

<a href="/guestbook.html">
<img onmouseover="this.src='/assets/guestbookd.gif'" onmouseout="this.src='/assets/guestbook.gif'" src="/assets/guestbook.gif" alt="Guestbook">
</a>

</nav>

`;
;
        
// Create a container element for the header
var headerContainer = document.createElement('div');
headerContainer.innerHTML = headerHTML;

// Insert the header container as the first child of the body
document.body.insertBefore(headerContainer, document.body.firstChild);
// Inject the footer at the very bottom of the page
var footerHTML = `
<div class="footer">
<center>
<img class="possObserve" src="/assets/tonberri.gif">

<a href="https://kingposs.com" target="_blank"><img class="h-swing" src="/assets/buttons/PossBadge.gif"></a>
<a href="https://neocities.org/" target="_blank"><img class="h-swing" src="/assets/buttons/NeoCitiesGreen.gif"></a>
<a href="https://32bit.cafe/" target="_blank"><img class="h-swing" src="/assets/buttons/32bitty.png"></a>
<img class="h-swing" src="/assets/buttons/twopaws.png">
<img class="h-swing" src="/assets/buttons/piracy.png">
<img class="h-swing" src="/assets/buttons/defund_badge.gif">
<img class="h-swing" src="/assets/buttons/htmldream.gif">
<a href="https://archive.org/" target="_blank"><img class="h-swing" src="/assets/buttons/internetarchive.gif"></a>
<a href="https://modarchive.org/" target="_blank"><img class="h-swing" src="/assets/buttons/modarchive.png"></a>
<a href="subrosa.html" target="_blank"><img class="h-swing" src="/assets/buttons/PossButtonRosa.gif"></a>

<img class="possObserve" src="/assets/tonberri.gif">
</center>
</div>
`;
      document.body.insertAdjacentHTML('beforeend', footerHTML);

      });

      