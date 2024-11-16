<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8">
    <title>TomyJan</title>
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <meta http-equiv="Cache-Control" content="no-transform">
    <meta http-equiv="Cache-Control" content="no-siteapp">
    <meta name="robots" content="index,follow">
    <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no">
    <meta name="keywords" content="TomyJan,荼蘼,主页">
    <meta name="description" content="TomyJan的个人主页">
    <link rel="stylesheet" href="https://cdn.tomys.top/common/font-awesome-4.7.0/css/font-awesome.css">
    <link rel="icon" type="image/x-icon" href="https://cdn.tomys.top/common/img/favicon.ico">
    <link rel="stylesheet" href="https://cdn.tomys.top/myindex/assets/css/main.css">
    <script src="https://cdn.tomys.top/myindex/assets/js/jquery.min.js"></script>
    <script src="https://cdn.tomys.top/myindex/assets/js/aplayer.min.js"></script>
    
    <!--移动端识别开始-->
    <meta http-equiv="mobile-agent" content="format=xhtml;url=index_old.html">
    <script type="text/javascript">
	if(window.location.toString().indexOf('pref=padindex') != -1)
	{}
	else
	{
		if(/AppleWebKit.*Mobile/i.test(navigator.userAgent) || (/MIDP|SymbianOS|NOKIA|SAMSUNG|LG|NEC|TCL|Alcatel|BIRD|DBTEL|Dopod|PHILIPS|HAIER|LENOVO|MOT-|Nokia|SonyEricsson|SIE-|Amoi|ZTE/.test(navigator.userAgent)))
	{
		if(window.location.href.indexOf("?mobile")<0)
	{
		try
	{
		if(/Android|Windows Phone|webOS|iPhone|iPod|BlackBerry/i.test(navigator.userAgent))
		{window.location.href="index_old.php";}
		else if(/iPad/i.test(navigator.userAgent)){}else{}}catch(e){}}}}
    </script>
    <!--移动端识别结束-->
    
    <style type="text/css">
        a:link {color:#FFFFFF;}      /* 未访问链接*/
        a:visited {color:#FFFFFF;}  /* 已访问链接 */
        a:hover {color:#00FBFF;}  /* 鼠标移动到链接上 */
        a:active {color:#0000FF;}  /* 鼠标点击时 */
    </style>
    <meta content="width=device-width, initial-scale=1" name="viewport">
    <style>
        * {margin: 0; padding: 0;}
        html, body {width: 100%; height: 100%; overflow: hidden;}
        
        #background_video {position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); object-fit: cover; height: 100%; width: 100%; z-index: -9999;}
        #video_cover {position: absolute; width: 100%; height: 100%; background: url(''); background-size: cover; background-position: center;}
        #overlay {position: absolute; top: 0; right: 0; left: 0; bottom: 0; background: rgba(0,0,0,0.5);}
        #video_controls {position: absolute; left: 96%; top: 92%; transform: translate(-50%, 0);}
        #mute img {width: 23px; height: 23px; background: url('https://cdn.tomys.top/myindex/videobg/blank.png') no-repeat; background-size: cover; background-position: center;}
    </style>
    
    
    <!-- Global site tag (gtag.js) - Google Analytics -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-N194P9LRRJ"></script>
    <script>
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());

        gtag('config', 'G-N194P9LRRJ');
    </script>
    <script>
        if (document.referrer.includes("hostloc.com")) {
            alert("看起来你是从 HostLoc 来到本站的? \n如果你是从一个名为 DMengbi 的东西的签名过来, 那么请知悉, 牠并不是本站站长, 也并未和本站站长相识, 只是一个拙劣的抹黑! \n不过感谢送来的流量喔~");
        }
    </script>
    
</head>

<body>
  <div id="container">
      <video id="background_video" loop muted>你的浏览器好像不支持内嵌视频诶，换个浏览器或者点击<a href="https://tomys.top/index_old.php" target="_blank">这里</a>访问旧版本吧~</video>
      <!-- #video_cover 是默认的视频封面 -->
      <div id="video_cover"></div>
      <!-- #overlay 遮罩层 -->
      <div id="overlay"></div>
      <!-- #video_controls 用来控制视频静音、取消静音 -->

      <div id="video_controls">
        <span id="mute" style="background-repeat: no-repeat;">
          <img src="https://cdn.tomys.top/myindex/videobg/blank.png">
        </span>
      </div>
      <!-- section 中添加任意你想展示的HTML内容 -->
      <section id="main_content">
      <div class="loading" >
        <div class="spinner">
            <div class="rect1"></div>
            <div class="rect2"></div>
            <div class="rect3"></div>
            <div class="rect4"></div>
            <div class="rect5"></div>
        </div>
    </div>

    <?php include 'body.html';?>
    
    <script src="https://cdn.tomys.top/myindex/assets/js/main.js"></script>
    </section>
  <script src="https://cdn.tomys.top/myindex/videobg/bideo.js"></script>
  <script>
    (function () {
    var bv = new Bideo();
    //视频背景直链数组 rain 心火 萤之森
    // var videoUrls = [
    //     'https://mirror.tomys.top/d/189Cloud/tomyjan-websites/static/video/av95473051_%E2%80%9CDo%20You%20Like%20Rain%E2%80%9D%20%E2%80%9CI%20Prefer%20You%E2%80%9D_2K.mp4?sign=l7jUsLmGNnZbujtD4HeXqEA4MvC2lcFOFn1dKl3WXV8=:0',
    //     'https://mirror.tomys.top/d/189Cloud/tomyjan-websites/static/video/av802039278_%E2%80%9C%E8%8B%A5%E5%BF%83%E7%81%AB%E7%BB%9A%E7%83%82%EF%BC%8C%E4%BA%BA%E4%BA%A6%E4%B8%8E%E7%83%9F%E8%8A%B1%E5%85%B1%E6%9F%93%E2%80%9D_2K.mp4?sign=yBhJNT5F7L9uTdZYuNCfM1YLpb8vI9GTtgrwLkC3cts=:0',
    //     'https://mirror.tomys.top/d/189Cloud/tomyjan-websites/static/video/av89474889_%E8%8D%A7%E4%B9%8B%E6%A3%AE.mp4?sign=n6T4tRGOT-ybnsTZnUKvAJ87Ss1RlLuiE_YGtkgzBi0=:0'
    //     ];
    var videoUrls = [
        'https://1253934854.vod2.myqcloud.com/a89107cevodcq1253934854/e208855e3270835015471114876/iAbeVyX87O8A.mp4?bili-avid=95473051',
        'https://1253934854.vod2.myqcloud.com/a89107cevodcq1253934854/9e4c871a3270835015446138405/A2whnUfubTgA.mp4?bili-avid=802039278',
        'https://1253934854.vod2.myqcloud.com/a89107cevodcq1253934854/ccf9295d3270835015467515037/khX5M4cLkukA.mp4?bili-avid=89474889'
        ];
    var videoUrl = videoUrls[Math.floor(Math.random()*videoUrls.length)];
    bv.init({
      // Video元素
      videoEl: document.querySelector('#background_video'),
      // 容器元素
      container: document.querySelector('body'),
      // 自适应调整
      resize: true,
      // autoplay: false,
      muteButton: document.querySelector('#mute'),
      // 静音图标
      _muteImage: 'https://cdn.tomys.top/myindex/videobg/mute.png',
      // 取消静音图标
      _unmuteImage: 'https://cdn.tomys.top/myindex/videobg/unmute.png',
      // 加载视频源, 根据实际业务更换自己的视频源文件
      src: [
        {
          src: videoUrl,
          type: 'video/mp4'
        }
      ],
      // 一旦视频加载后即将视频封面隐藏
      onLoad: function () {
        document.querySelector('#video_cover').style.display = 'none';
        document.querySelector('#mute').style.backgroundImage = "url('https://cdn.tomys.top/myindex/videobg/mute.png')";
        
      }
    });
  }());
  </script>
</body>
</html>
