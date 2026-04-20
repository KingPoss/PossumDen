<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:atom="http://www.w3.org/2005/Atom">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title><xsl:value-of select="rss/channel/title"/> — RSS Feed</title>
        <link rel="shortcut icon" type="image/jpg" href="/assets/favicon.ico"/>
        <style>
          :root {
            --rotaorange: #ff602d;
            --rotalightorange: #ff8b2d;
            --rotayellow: #ffc72d;
            --darkpurple: #41103e;
            --lightpurple: #571b6c;
            --def-border-color: #df7126;
            --def-element-background: rgba(57, 19, 94, 0.5);
            --def-detail-color: #ccc;
          }
          html { box-sizing: border-box; }
          *, *::before, *::after { box-sizing: inherit; }
          body {
            margin: 0;
            padding: 1.5rem;
            background: #000;
            background-image: url("data:image/svg+xml,%3Csvg width='42' height='44' viewBox='0 0 42 44' xmlns='http://www.w3.org/2000/svg'%3E%3Cg id='Page-1' fill='none' fill-rule='evenodd'%3E%3Cg id='brick-wall' fill='%23673d6f' fill-opacity='0.73'%3E%3Cpath d='M0 0h42v44H0V0zm1 1h40v20H1V1zM0 23h20v20H0V23zm22 0h20v20H22V23z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
            color: white;
            font-family: system-ui, -apple-system, "Segoe UI", sans-serif;
            font-size: 1rem;
            line-height: 1.5;
          }
          main {
            max-width: 60rem;
            margin: 0 auto;
            padding: 1.5rem;
            background: var(--darkpurple);
            border: 3px outset var(--def-border-color);
            border-radius: 20px;
            outline: 1px outset var(--def-border-color);
            outline-offset: -6px;
          }
          .feed-explainer {
            background: var(--def-element-background);
            border: 2px dashed var(--rotayellow);
            border-radius: 10px;
            padding: 0.75rem 1rem;
            margin-bottom: 1.5rem;
            font-size: 0.95rem;
          }
          .feed-explainer strong { color: var(--rotayellow); }
          .feed-explainer code {
            background: rgba(0,0,0,0.4);
            padding: 0.1rem 0.4rem;
            border-radius: 4px;
            color: var(--rotalightorange);
            font-size: 0.9em;
            word-break: break-all;
          }
          h1 {
            color: var(--rotayellow);
            margin: 0 0 0.25rem 0;
            font-size: 2rem;
          }
          .channel-desc {
            color: var(--def-detail-color);
            margin: 0 0 0.5rem 0;
          }
          .channel-meta {
            color: var(--def-detail-color);
            font-size: 0.85rem;
            margin-bottom: 1.5rem;
          }
          hr {
            border: none;
            border-top: 3px solid var(--def-border-color);
            border-bottom: 1px solid var(--def-border-color);
            border-radius: 20px;
            margin: 1.5rem 0;
          }
          .item {
            background: var(--def-element-background);
            border: 2px solid var(--def-border-color);
            border-radius: 20px;
            padding: 1rem 1.25rem;
            margin-bottom: 1rem;
          }
          .item h2 {
            color: var(--rotayellow);
            margin: 0 0 0.25rem 0;
            font-size: 1.4rem;
          }
          .item .pub-date {
            color: var(--def-detail-color);
            font-size: 0.85rem;
            margin: 0 0 0.75rem 0;
          }
          .item .description { word-wrap: break-word; overflow-wrap: break-word; }
          .item .description p:first-child { margin-top: 0; }
          .item .description p:last-child { margin-bottom: 0; }
          .item .description ul { padding-left: 1.5rem; }
          .item a { color: var(--rotalightorange); }
          .item a:hover { color: var(--rotaorange); }
          .item img { max-width: 100%; height: auto; }
          footer {
            text-align: center;
            color: var(--def-detail-color);
            font-size: 0.85rem;
            margin-top: 1.5rem;
          }
          footer a { color: var(--rotalightorange); }
        </style>
      </head>
      <body>
        <main>
          <div class="feed-explainer">
            <strong>This is an RSS feed!</strong> It contains my site updates, blog posts, and broadcast announcements.
            To follow this feed in an RSS reader, copy this URL: <code><xsl:value-of select="rss/channel/atom:link/@href"/></code>
          </div>

          <h1><xsl:value-of select="rss/channel/title"/></h1>
          <p class="channel-desc"><xsl:value-of select="rss/channel/description"/></p>
          <p class="channel-meta">
            <a href="{rss/channel/link}"><xsl:value-of select="rss/channel/link"/></a>
            <xsl:if test="rss/channel/lastBuildDate">
              &#160;&#183;&#160; Last updated: <xsl:value-of select="rss/channel/lastBuildDate"/>
            </xsl:if>
          </p>

          <hr/>

          <xsl:for-each select="rss/channel/item">
            <article class="item">
              <h2><xsl:value-of select="title"/></h2>
              <xsl:if test="pubDate">
                <p class="pub-date"><xsl:value-of select="pubDate"/></p>
              </xsl:if>
              <div class="description">
                <xsl:value-of select="description" disable-output-escaping="yes"/>
              </div>
            </article>
          </xsl:for-each>

          <footer>
            <a href="/">&#8592; Back to The Possum Den</a>
          </footer>
        </main>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
