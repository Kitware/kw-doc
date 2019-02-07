<header id="banner" class="wrapper">
  {% if page.subtitle %}
    <div class="inner">
      <h2 id="banner-title">{{ page.subtitle }}</h2>
      <div id="banner-start">
        {% if page.img %}
          <img id="banner-start-image" src="{{ page.img }}"/>
          {% if page.imgcaption %}
            <div id="banner-start-captionbox"><b> About this image: &nbsp;</b>
              <span id="banner-start-caption">{{ page.imgcaption }}</span>
            </div>
          {% endif %}
        {% endif %}
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
