<?php
// TODO, 老地址保留, 需要设置在 cdn 跳转到 .html
?>

<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8" />
		 <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no">
		<link rel="stylesheet" href="/bootstrap.min.css" integrity="sha384-ggOyR0iXCbMQv3Xipma34MD+dH/1fQ784/j6cY/iJTQUOhcWr7x9JvoRxT2MZw1T" crossorigin="anonymous">
		<title>向 TomyJan 付款</title>
		<style>
			*{
			    padding: 0px;
				margin: 0px;
			}
			body{
				width: 100%;
				height: 100vh;
			}
			.main{
				position: relative;
			    width: 100%;
				height: 100%;
				background: #000;
				display: flex;
				justify-content: center;
				align-items: center;
			}
			.circle{
				display: flex;
				justify-content: center;
				align-items: center;
				width: 200px;
				height: 200px;
				background-image: linear-gradient(0deg,
				rgb(47,102,255),
				rgb(153,64,255) 30%,
				rgb(238,55,255) 60%,
				rgb(255,0,76) 100%);
				border-radius: 50%;
				animation: rotate 1s linear infinite;
			}
			/* 模糊 */
			.circle::before{
				content: "";
				position:absolute;
				width: 200px;
				height: 200px;
				background-image: linear-gradient(0deg,
				rgb(47,102,255),
				rgb(153,64,255) 30%,
				rgb(238,55,255) 60%,
				rgb(255,0,76) 100%);
				border-radius: 50%;
				filter: blur(35px);
			}
			/* 黑圆 */
			.circle::after{
				content: "";
				position:absolute;
				width: 150px;
				height: 150px;
				background:#000;
				border-radius: 50%;
			}
			h1{
				position: absolute;
				color: #fff;
				font-weight: bold;
			}
			.title{
				color: #FFFFFF;
				position:absolute;
				top:10%;
				text-shadow:0px 0 30px #fff;
				text-align: center;
				font-size: 2rem;
				font-weight: bold;
			}
			.text{
				color: #FFFFFF;
				position:absolute;
				bottom:10%;
				text-shadow:0px 0 30px #fff;
				font-weight: bold;text-align: center;
			}
			/* 添加动画 */
			@keyframes rotate{
				0%{
					transform: rotate(0deg);
				}
				100%{
					transform: rotate(360deg);
				}
			}
		</style>
		
		<!-- Global site tag (gtag.js) - Google Analytics -->
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-N194P9LRRJ"></script>
        <script>
             window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            
            gtag('config', 'G-N194P9LRRJ');
        </script>
		
	</head>
	<body onload="time()">
	    <div class="main">
			<div class="circle"></div>
			<h1 id="second">5s</h1>
			<p class="title">当前地址已失效，正在跳转到新地址</p>
			<p class="text">该地址即将停用, 您可向 TomyJan 索取最新收款码</p>
		</div>
	</body>
	<script>
		function cs(){
			return("https://public-cdn.tomys.top/paycode/");//无指定跳转地址，将跳转此网页地址。
		}
		function time(){
			var sec = document.getElementById("second");
			 var i = 5;//设置定时时间
			 var timer = setInterval(function(){
			 i--;
			 sec.innerHTML = i+"s";
			 if(i==1){
			  window.location.href = cs();
			 }
			 },1000);
			  
			 function goBack(){ 
			 window.history.go(-1);
			 } 
		}
	</script>
</html>
