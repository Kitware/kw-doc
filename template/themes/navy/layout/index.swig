<header id="banner" class="wrapper">
  {% if page.subtitle %}
    <div class="inner">
      <h2 id="banner-title">{{ page.subtitle }}</h2>
      <div id="banner-start">
        {% if page.cmd %}
          <span id="banner-start-command">{{ page.cmd }}</span>
        {% endif %}
      </div>
    </div>
  {% endif %}
</header>
<div id="content-wrap">
  <div class="wrapper">
    <div class="inner">
      {{ page.content }}
    </div>
  </div>
</div>
