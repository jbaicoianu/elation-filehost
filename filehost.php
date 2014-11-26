<?php

class Component_filehost extends Component {

  public $postprocess = array(
    "image/jpeg" => "thumbnail",
    "image/png" => "thumbnail",
    "image/x-3ds" => "convert-3ds-threejs",
    "application/x-blender" => "convert-blend-threejs"
  );

  public $permissions = array(
    "private" => 0,
    "protected" => 1,
    "public" => 2
  );


  public function init() {
    OrmManager::LoadModel("filehost");
    $this->rootdir = ConfigManager::get("filehost.rootdir", "tmp/filehost");
  }
  /* utility functions */
  public function getImagePath($user, $dirname=null, $filename=null) {
    $userhash = md5($user->usertype . "-" . $user->userid);
    $fullpath = sprintf("%s/%s", $this->rootdir, $userhash);
    if ($dirname !== null) {
      $fullpath .= "/" . $dirname;

      if ($filename !== null) {
        $fullpath .= "/" . $filename;
      }
    }
    return $fullpath;
  }
  public function createFile($user, $dirname, $filename, $data) {
    $file = OrmManager::load("FileModel", array($user->usertype, $user->userid, $dirname, $filename));
    if (empty($file)) {
      $file = new FileModel();
      $file->usertype = $user->usertype;
      $file->userid = $user->userid;
      $file->dirname = $dirname;
      $file->filename = $filename;
    }
    $file->filetype = $data["type"];
    $file->filesize = $data["size"];
    $file->status = any($data["status"], 0);
    $file->checksum = $this->getFileChecksum($user, $dirname, $filename);
    $file->modified_time = gmdate('Y-m-d H:i:s');
    OrmManager::save($file);
    return $file;
  }
  public function renameFile($user, $dirname, $filename, $newdirname, $newfilename) {
    $user = User::current();
    $newdir = $this->createDirectory($user, $newdirname);
    $oldfile = $this->getFile($user, $dirname, $filename);
    $oldfilepath = $this->getImagePath($user, $dirname, $filename);
    $newfilepath = $this->getImagePath($user, $newdirname, $newfilename);
    echo "rename($oldfilepath, $newfilepath)";
    if (file_exists($oldfilepath) && !file_exists($newfilepath)) {
      rename($oldfilepath, $newfilepath);
      //$file->dirname = $newdirname;
      $newfile = new FileModel();
      foreach ($oldfile as $k=>$v) {
        $newfile->{$k} = $v;
      }
      $newfile->filename = $newfilename;
      OrmManager::delete("FileModel", array($oldfile->usertype, $oldfile->userid, $oldfile->dirname, $oldfile->filename));
      OrmManager::save($newfile);
      return true;
    }
    return false;
  }
  public function createDirectory($user, $dirname) {
    // Get upload dir reference, create if it doesn't exist
    $dir = OrmManager::load("DirectoryModel", array($user->usertype, $user->userid, $dirname));
    if (empty($dir)) {
      $dir = new DirectoryModel();
      $dir->usertype = $user->usertype;
      $dir->userid = $user->userid;
      $dir->dirname = $dirname;
      OrmManager::save($dir);
    }

    $uploaddir = $this->getImagePath($user, $dirname);
    if (!file_exists($uploaddir)) {
      mkdir($uploaddir, 0755, true);
    }
    return $dir;
  }
  public function getFileChecksum($user, $dirname, $filename) {
    $filepath = $this->getImagePath($user, $dirname, $filename);
    return (file_exists($filepath) ? md5_file($filepath) : false);
  }
  public function getFileMetadata($user, $dirname, $filename) {
    $fullpath = $this->getImagePath($user, $dirname, $filename);
    if (file_exists($fullpath)) {
      $metadata = array(
        "size" => filesize($fullpath)
      );
      $finfo = finfo_open(FILEINFO_MIME);
      $contenttype = explode(";", finfo_file($finfo, $fullpath));
      $metadata["type"] = $contenttype[0];
      return $metadata;
    }
    return false;
  }
  public function getDirectories($user, $usedb=true) {
    $directories = array();
    if ($usedb) {
      $dbdirectories = OrmManager::Select("DirectoryModel", "WHERE usertype=:usertype AND userid=:userid", array("usertype" => $user->usertype, "userid" => $user->userid));
      if (!empty($dbdirectories)) {
        foreach ($dbdirectories as $dir) {
          if (!empty($dir->metadata)) {
            $dir->metadata = json_decode($dir->metadata);
          }
          $directories[$dir->dirname] = $dir;
        }
      }
    } else {
      $rootdir = $this->getImagePath($user);
      $dh = opendir($rootdir);
      $directories = array();
      while (($dirname = readdir($dh)) !== false) {
        if ($dirname[0] == '.') continue; // skip hidden files

        $stat = stat($rootdir . "/" . $dirname);

        $newdir = new DirectoryModel();
        $newdir->usertype = $user->usertype;
        $newdir->userid = $user->userid;
        $newdir->dirname = $dirname;
        $newdir->modified_time = mysql_timestamp($stat["mtime"]);
        $newdir->created_time = mysql_timestamp($stat["ctime"]);
        
        $directories[$newdir->dirname] = $newdir;
      }
    }
    if (!empty($directories)) {
      ksort($directories);
    }
    return $directories;
  }
  public function getDirectory($user, $dirname) {
    $directory = OrmManager::Load("DirectoryModel", array("usertype" => $user->usertype, "userid" => $user->userid, "dirname" => $dirname));
    if (!empty($directory->metadata)) {
      $directory->metadata = json_decode($directory->metadata);
    }
    return $directory;
  }
  public function getFiles($user, $dirname, $args=array()) {
    $files = array();
    if (!$args["usefilesystem"]) {
      $sortby = any($args["sortby"], "filename") . (!empty($args["sortreverse"]) ? " DESC" : "");
      $dbfiles = OrmManager::Select("FileModel", "WHERE usertype=:usertype AND userid=:userid AND dirname=:dirname ORDER BY $sortby", array("usertype" => $user->usertype, "userid" => $user->userid, "dirname" => $dirname));
      if (!empty($dbfiles)) {
        foreach ($dbfiles as $v) {
          $files[$v->filename] = $v;
        }
      }
    } else {
      $rootdir = $this->getImagePath($user, $dirname);
      $dh = opendir($rootdir);
      $files = array();
      while (($filename = readdir($dh)) !== false) {
        if ($filename[0] == '.') continue; // skip hidden files

        $stat = stat($rootdir . "/" . $filename);
        $metadata = $this->getFileMetadata($user, $dirname, $filename);

        $newfile = new FileModel();
        $newfile->usertype = $user->usertype;
        $newfile->userid = $user->userid;
        $newfile->dirname = $dirname;
        $newfile->filename = $filename;
        $newfile->filesize = $metadata["size"];
        $newfile->filetype = $metadata["type"];
        $newfile->modified_time = mysql_timestamp($stat["mtime"]);
        $newfile->created_time = mysql_timestamp($stat["ctime"]);
        
        $files[$filename] = $newfile;
      }
    }
    if (!empty($files)) {
      foreach ($files as $f) {
        $this->generateFileURLs($f);
      }
      //ksort($files);
    }
    return $files;
  }
  public function getFile($user, $dirname, $filename) {
    $file = OrmManager::Load("FileModel", array($user->usertype, $user->userid, $dirname, $filename));
    //print_pre($user->usertype . "." . $user->userid . "." . $dirname . "." . $filename);
    //$this->generateFileURLs($file);
    return $file;
  }
  public function generateFileURLs($file) {
    $userhash = md5($file->usertype . "-" . $file->userid);
    $urls = array(
      "full" => "/images/filehost/" . $userhash . '/' . $file->dirname . '/' . $file->filename,
      "thumb" => "/images/filehost/" . $userhash . '/' . $file->dirname . '/.thumbs/' . (preg_match("/^image\//", $file->filetype) ? $file->filename : preg_replace("/\.(.*?)$/", ".jpg", $file->filename)),
    );
    $file->urls = $urls;
    return $file;
  }

  /* controllers */
  public function controller_filehost($args) {
    $vars = array();
    $user = User::current();

/*
    if (!$user->loggedin) {
      throw new ElationUserAuthException();
    }
*/

    $vars["dirname"] = any($args["dirname"], "uploads");
    $vars["directories"] = $this->getDirectories($user);
    $vars["files"] = $this->getFiles($user, $vars["dirname"]);
    return $this->GetComponentResponse("./filehost.tpl", $vars);
  }
  public function controller_directories($args) {
    $user = User::current();
    if (!empty($args["create"])) {
      $vars["newdirectory"] = $this->createDirectory($user, $args["create"]);
    }
    $vars["directories"] = $this->getDirectories($user);
    return $this->GetComponentResponse("./directories.tpl", $vars);
  }
  public function controller_files($args) {
    $user = User::current();
    $vars["usertype"] = $user->usertype;
    $vars["userid"] = $user->userid;
    $vars["dirname"] = any($args["dirname"], "uploads");
    $vars["files"] = $this->getFiles($user, $vars["dirname"]);
    return $this->GetComponentResponse("./files.tpl", $vars);
  }
  public function controller_upload($args) {
    $vars = array();
    $user = User::current();
    $vars["dirname"] = any($args["dirname"], "uploads");

    if (!empty($_FILES["upload"])) {
      $upload = $_FILES["upload"];

      $dir = $this->createDirectory($user, $vars["dirname"]);

      $uploadfile = $this->getImagePath($user, $dir->dirname, $upload["name"]);
      $vars["success"] = move_uploaded_file($upload["tmp_name"], $uploadfile);
      if ($vars["success"]) {
        // Create file reference in db, and set status=1
        $upload["status"] = 1;
        $file = $this->createFile($user, $dir->dirname, $upload["name"], $upload);

        if ($file->filetype && !empty($this->postprocess[$file->filetype])) {
          $client = new GearmanClient();
          $client->addServer();
          $client->doBackground($this->postprocess[$file->filetype], $uploadfile);
        }
      }
    }
    return $this->GetComponentResponse("./upload.tpl", $vars);
  }
  public function controller_check($args) {
    $user = User::current();
    $vars["dirname"] = $args["dirname"];
    $vars["filename"] = $args["filename"];
    $fulldir = $this->getImagePath($user, $vars["dirname"]);
    $fullpath = $this->getImagePath($user, $vars["dirname"], $vars["filename"]);
    $vars["file_exists"] = file_exists($fullpath);
    $vars["file_writable"] = ($vars["exists"] ? is_writable($fullpath) : is_writable($fulldir));
    $vars["file_checksum"] = $this->getFileChecksum($user, $vars["dirname"], $vars["filename"]);

    $fileentry = OrmManager::load("FileModel", array($user->usertype, $user->userid, $vars["dirname"], $vars["filename"]));
    if (empty($fileentry) && !empty($args["create"])) {
      $filedata = $this->getFileMetadata($user, $vars["dirname"], $vars["filename"]);
      $fileentry = $this->createFile($user, $vars["dirname"], $vars["filename"], $filedata);
    }
    $vars["entry_exists"] = !empty($fileentry);
    $vars["entry"] = ($vars["entry_exists"] ? $fileentry : false);
    
    return $this->GetComponentResponse("./check.tpl", $vars);
  }
  public function controller_rename($args) {
    $user = User::current();
    if (!$user->loggedin) {
      throw new ElationUserAuthException();
    }
    $vars["dirname"] = $args["dirname"];
    $vars["filename"] = any($args["filename"], false);
    if (!empty($args["newfilename"]) || !empty($args["newdirname"])) {
      $vars["newdirname"] = any($args["newdirname"], $vars["dirname"]);
      $vars["newfilename"] = any($args["newfilename"], false);
      if ($vars["newfilename"]) {
        $this->renameFile($user, $vars["dirname"], $vars["filename"], $vars["newdirname"], $args["newfilename"]);
      } else {
        $this->renameDirectory($user, $vars["dirname"], $vars["newdirname"]);
      }
    }
  }
  public function controller_rebuild($args) {
    $user = User::current();
    $fsdirs = $this->getDirectories($user, false);
    $dbdirs = $this->getDirectories($user, true);
    $vars["verify"] = any($args["verify"], false);

    $missing = array(
      "directories" => 0,
      "files" => 0,
      "checksum" => 0
    );

    foreach ($fsdirs as $dirname=>$dir) {
      if (!isset($dbdirs[$dirname])) {
        // Missing directory, write to db
        OrmManager::save($dir);
        $missing["directories"]++;
      }

      $fsfiles = $this->getFiles($user, $dirname, array("usefilesystem" => false));
      $dbfiles = $this->getFiles($user, $dirname, array("usefilesystem" => true));
      foreach ($fsfiles as $filename=>$file) {
        if (!isset($dbfiles[$filename])) {
          // Missing file, write to db
          $file->checksum = $this->getFileChecksum($user, $dirname, $filename);
          OrmManager::save($file);
          $missing["files"]++;
        } else if ($vars["verify"]) {
          $file->checksum = $this->getFileChecksum($user, $dirname, $filename);
          if ($file->checksum != $dbfiles[$filename]->checksum) {
            // Checksum differs, update with newer one
            $dbfiles[$filename]->checksum = $file->checksum;
            $dbfiles[$filename]->filesize = $file->filesize;
            
            $missing["checksum"]++;
            OrmManager::save($dbfiles[$filename]);
          }
        }
      }
    }
    //print_pre($fsdirs);    
    //print_pre($dbdirs);    
    $vars["missing"] = $missing;
    return $this->getComponentResponse("./rebuild.tpl", $vars);
  }
  public function controller_view($args) {
    $user = (!empty($args["user"]) ? User::get("default", $args["user"]) : User::current());

    $vars["dirname"] = $args["dirname"];
    //$vars["directories"] = $this->getDirectories($user);
    $directory = $this->getDirectory($user, $vars["dirname"]);
    if ($directory->permissions & $this->permissions["public"]) {
      $vars["directory"] = $directory;
      $fileargs = array("sortby" => "filename", "sortreverse" => false);
      if (!empty($vars["directory"]->metadata)) {
        $metadata = $vars["directory"]->metadata;
        if (!empty($metadata->sortby)) $fileargs["sortby"] = $metadata->sortby;
        if (!empty($metadata->sortreverse)) $fileargs["sortreverse"] = $metadata->sortreverse;
      }
      $vars["files"] = $this->getFiles($user, $vars["dirname"], $fileargs);
    }
    
    return $this->getComponentResponse("./view.tpl", $vars);
  }
}  
