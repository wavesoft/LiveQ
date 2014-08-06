<?php

$images_dir = dirname(__FILE__)."/dat/images";
$images_url = "/liveq-test/dat/images";

@$action = $_GET['a'];
if ($action == "import") {

	@$url = $_GET['url'];
	if (!$url) {
		die(json_encode(array(
				'res' => 'error',
				'error' => 'URL not specified!'
			)));
	}

	// Get ID
	$id = sha1($url);

	// Guess mime type based on extension
	$parts = parse_url($url);
	$parts = explode(".", $parts['path']);
	$ext = $parts[sizeof($parts)-1];

	// Calculate filename
	$fname = "${id}.${ext}";
	$file = "${images_dir}/${fname}";
	if (!is_file($file)) {

		// Download file
		$buffer = file_get_contents($url);
		file_put_contents($file, $buffer);

	}

	// Echo
	die(json_encode(array(
			'res' => 'ok',
			'file' => "${images_url}/${fname}"
		)));

} else if ($action == "list") {

	$proper_files = array();
	$files = scandir($images_dir);
	foreach ($files as $f) {
		if ($f[0] != ".")
			$proper_files[] = $images_url.'/'.$f;
	}

	die(json_encode(array(
			'res' => 'ok',
			'files' => $proper_files
		)));	


}

?>