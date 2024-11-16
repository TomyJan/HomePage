<?php
$msg = $_GET['msg'];
// TODO, 老地址保留, 需要设置在 cdn 跳转到 .json, 并触发警告
header("Content-Type:text/json;charset=UTF-8");
echo {"code":-999,"content":{"result":["{\"counts\":1,\"logs\":[\"invalid api\"],\"success\":\"no\"}"]}};
?>
