<?php

// Check if config.php is missing
if (!file_exists("config/account.php")) {
		die("Please prepare a config/account.php, according to config/account.php.template!");
}

// Enable CORS
header("Access-Control-Allow-Origin: *");

// Import account info from the account.php
$account = require("config/account.php");
$aLogin = $account['login'];
$aApp = $account['app'];
$aPassword = $account['password'];

// Base URL
$aBaseURL = "http://vaas.acapela-group.com/Services/Synthesizer";

// Response base URL (where server is running)
$aCacheURL = "//test4theory.cern.ch/voiceapi/cache";

/**
 * Allocate a new acapella sound
 */
function acapellaNew($text, $voiceName = 'heather22k', $soundType = 'WAV') {
		global $aLogin, $aApp, $aPassword, $aBaseURL;

		// Prepare request
		$req = array(
						'prot_vers' => 2,
						'cl_env' => 'PHP_APACHE_2.2.15_CENTOS',
						'cl_vers' => '1-30',
						'cl_login' => $aLogin,
						'cl_app' => $aApp,
						'cl_pwd' => $aPassword,
						'req_type' => 'NEW',
						'req_voice' => $voiceName,
						'req_text' => $text,
						'req_snd_type' => $soundType,
						'req_asw_type' => 'INFO',

						// Word sync info
						'req_wp' => 'ON'
				);

		// Send request
		$options = array(
				'http' => array(
						'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
						'method'  => 'POST',
						'content' => http_build_query($req),
				),
		);

		// Open stream
		$context  = stream_context_create($options);
		$result = file_get_contents($aBaseURL, false, $context);

		// Analyze response
		if ($result == "") return false;
		$vars = array();
		parse_str( $result, $vars );

		// Check for errors
		if ($vars['res'] != 'OK') return false;

		// Load the word timing info
		$wpBuffer = file_get_contents( $vars['wp_url'] );
		$words = explode("\n", $wpBuffer);

		// Map between word contents and timestamp
		$wordParts = array( );
		foreach ($words as $i => $v) {
				if (trim($v) == "") continue;

				$parts = explode("=", $v);
				$time = $parts[0];
				$parts = explode("/", $parts[1]);
				$offset = $parts[1];
				$end = strpos( $text, ' ', $offset );
				if ($end === false) $end = strlen($text);
				$len = $end - $offset;

				$w = substr($text, $offset, $len);

				// Map timestamp & Offset
				$wordParts[] = array( $time, $w );
		}

		// Return sound info
		return array(
						'id' => $vars['snd_id'],
						'soundURL' => $vars['snd_url'],
						'wordURL' => $vars['wp_url'],
						'duration' => $vars['snd_time'],
						'size' => $vars['snd_size'],
						'words' => $wordParts
				);
}

/**
 * Delete an acapella sound
 */
function acapellaDelete($id) {
		global $aLogin, $aApp, $aPassword, $aBaseURL;

		// Prepare request
		$req = array(
						'prot_vers' => 2,
						'cl_env' => 'PHP_APACHE_2.2.15_CENTOS',
						'cl_vers' => '1-30',
						'cl_login' => $aLogin,
						'cl_app' => $aApp,
						'cl_pwd' => $aPassword,
						'req_type' => 'DEL',
						'req_snd_id' => $id
				);

		// Send request
		$options = array(
				'http' => array(
						'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
						'method'  => 'POST',
						'content' => http_build_query($req),
				),
		);

		// Open stream
		$context  = stream_context_create($options);
		$result = file_get_contents($aBaseURL, false, $context);

		// Analyze response
		if ($result == "") return false;
		$vars = array();
		parse_str( $result, $vars );

		// Check for errors
		if ($vars['res'] != 'OK') return false;

		// OK
		return true;

}

/**
 * Delete an acapella sound
 */
function acapellaGet($id) {
		global $aLogin, $aApp, $aPassword, $aBaseURL;

		// Prepare request
		$req = array(
						'prot_vers' => 2,
						'cl_env' => 'PHP_APACHE_2.2.15_CENTOS',
						'cl_vers' => '1-30',
						'cl_login' => $aLogin,
						'cl_app' => $aApp,
						'cl_pwd' => $aPassword,
						'req_type' => 'GET',
						'req_snd_id' => $id
				);

		// Send request
		$options = array(
				'http' => array(
						'header'  => "Content-type: application/x-www-form-urlencoded\r\n",
						'method'  => 'POST',
						'content' => http_build_query($req),
				),
		);

		// Open stream
		$context  = stream_context_create($options);
		$result = file_get_contents($aBaseURL, false, $context);

		// Analyze response
		if ($result == "") return false;
		$vars = array();
		parse_str( $result, $vars );

		// Check for errors
		if ($vars['res'] != 'OK') return false;

		// Return sound info
		return array(
						'soundURL' => $vars['snd_url'],
						'wordURL' => $vars['wp_url'],
						'duration' => $vars['snd_time'],
						'size' => $vars['snd_size']
				);

}

/**
 * Delete previous revision
 */
function del_previous($id) {

	// If we have a missing ID do nothing
	if (!isset($id)) return;

	// Check if we have such file
	$del_base = dirname(__FILE__)."/cache/".$id;
	if (is_file("${del_base}.php")) {

		// Load information
		$info = include("${del_base}.php");

		// Delete base files
		if (is_file("${del_base}.wav")) unlink("${del_base}.wav");
		if (is_file("${del_base}.mp3")) unlink("${del_base}.mp3");
		if (is_file("${del_base}.ogg")) unlink("${del_base}.ogg");
		if (is_file("${del_base}.php")) unlink("${del_base}.php");

		// Delete link file
		if (is_file($info['link_file'])) unlink($info['link_file']);

	}

}

// Check if we just need to fetch the cached info
if (isset($_GET['get'])) {

	// Check if we have a string to process
	$id = $_GET['get'];

	// Fetch cache info file
	$info_file = dirname(__FILE__)."/cache/".$id.".php";
	if (!is_file($info_file)) {
		die(json_encode(array(
						'res' => "error",
						'err_msg' => 'Cached record not found'
				)));		
	}

	// Echo cached response & exit
	$info = include($info_file);
	die(json_encode(array(
			'res'		=> 'ok',
			'id'		=> $id,
			'base_url'	=> $aCacheURL."/".$id,
			'formats'	=> array("wav", "mp3", "ogg"),
			'duration'	=> $info['duration'],
			'words'		=> $info['words'],
		)));

}

// Create new entry if we have 'text'
else if (isset($_GET['text'])) {

		// Check if we have a string to process
		$text = $_GET['text'];

		// Get voice
		@$voice = $_GET['voice'];
		if (!isset($voice))
				$voice='heather22k';

		// Check if we have cached that string/voice before
		$link_file = dirname(__FILE__)."/cache/".sha1($text)."-".$voice.".lnk";
		if (is_file($link_file)) {
			$id = file_get_contents($link_file);
			if (is_file(dirname(__FILE__)."/cache/".$id.".php")) {

				// If we have a delete request do not proceed with deleting
				// ONLY if the file to delete is the same with this
				if (isset($_GET['del']) && ($_GET['del'] != $id))
					del_previous( $_GET['del'] );

				// Build response
				$info = include(dirname(__FILE__)."/cache/".$id.".php");

				// Echo cached response & exit
				die(json_encode(array(
						'res'		=> 'ok',
						'id'		=> $id,
						'base_url'	=> $aCacheURL."/".$id,
						'formats'	=> array("wav", "mp3", "ogg"),
						'duration'	=> $info['duration'],
						'words'		=> $info['words'],
					)));

			} else {
				// Link file points to invalid data, remove
				unlink( $link_file );
			}

		}

		// Delete previous version if asked by the user
		del_previous( $_GET['del'] );

		// Create new text
		$info = acapellaNew($text, $voice);

		// Build response
		if ($info == false) {

			// Respond error
			die(json_encode(array(
							'res' => "error",
							'err_msg' => 'Unable to create sound object'
					)));

		} else {

			// Get ID
			$id = $info['id'];
			$url = $info['soundURL'];

			// Cache sound file
			$out = "";
			$res = 0;
			$file_base = dirname(__FILE__)."/cache/${id}";

			// Download & Delete from acapella
			exec("/usr/bin/wget -O '${file_base}.wav' '${url}'", $out, $res);
			acapellaDelete($id);

			// Check downloa status
			if ($res != 0) {
				// Error
				die(json_encode(array(
							'res' => "error",
							'err_msg' => 'Unable to download the sound object'
						)));
			}

			// Convert to MP3
			$ffmpeg_bin = dirname(__FILE__)."/bin/ffmpeg";
			exec("${ffmpeg_bin} -i '${file_base}.wav' '${file_base}.mp3'", $out, $res);
			if ($res != 0) {
				// Error
				die(json_encode(array(
							'res' => "error",
							'err_msg' => 'Unable to convert file to mp3'
						)));
			}

			// Convert to OGG
			$ffmpeg_bin = dirname(__FILE__)."/bin/ffmpeg";
			exec("${ffmpeg_bin} -i '${file_base}.wav' '${file_base}.ogg'", $out, $res);
			if ($res != 0) {
				// Error
				die(json_encode(array(
							'res' => "error",
							'err_msg' => 'Unable to convert file to ogg'
						)));
			}

			// Cache lookup link
			$info['link_file'] = $link_file;
			file_put_contents(
				$link_file, $id
			);

			// Cache the result
			file_put_contents(
				$file_base.".php", 
				"<"."?php return " .var_export($info,true) . "\n?".">"
			);

			// Build response
			echo json_encode(array(
					'res'		=> 'ok',
					'id'		=> $id,
					'base_url'	=> $aCacheURL."/".$id,
					'formats'	=> array("wav", "mp3", "ogg"),
					'duration'	=> $info['duration'],
					'words'		=> $info['words'],
				));

		}
}



?>
