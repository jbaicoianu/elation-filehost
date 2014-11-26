elation.component.add('filehost.directorytree', function() {
  this.init = function() {
    elation.html.addclass(this.container, 'filehost_directorytree');
    this.dirname = this.args.dirname || 'uploads';
    if (!elation.user.loggedin) {
      this.userauth = elation.user.auth(null, elation.html.create({append: this.container}), {});
    } else {
      if (this.args.directories) {
        this.directories = this.getDirectoryTree(this.args.directories);
        this.treeview = elation.ui.treeview(null, elation.html.create({append: this.container}), {items: this.directories, attrs: {name: 'dirname', label: 'dirname'}, selected: this.dirname});
        elation.events.add(this.treeview, "ui_treeview_select", elation.bind(this, function(ev) {
          this.setDirectory(ev.data.value.dirname);
        }));
      }
      this.actions = elation.ui.buttonbar(null, elation.html.create({append: this.container}), {
        buttons: {
          'create': {label: 'create', events: { click: elation.bind(this, this.showCreateDirectoryDialog) } }
        }
      });
    }
  }
  this.getDirectoryTree = function(directories) {
    // TODO - parse full directory path into tree by splitting on /
    var ret = {};
    for (var k in directories) {
      ret[directories[k].dirname] = directories[k];
    }
    return ret;
  }
  this.setDirectory = function(dirname) {
    this.dirname = dirname;
    elation.events.fire({type: 'directory_change', element: this, data: dirname});
  }
  this.createDirectory = function(dirname) {
    elation.ajax.Get("/filehost/directories.js?create=" + dirname, null, {
      callback: elation.bind(this, this.processCreateDirectory)
    });
  }
  this.processCreateDirectory = function(evdata) {
    var response = JSON.parse(evdata);
    this.treeview.setItems(this.getDirectoryTree(response.data.directories));
    this.setDirectory(response.data.newdirectory.dirname);
  }
  this.showCreateDirectoryDialog = function(ev) {
    var dirname = prompt("WTF?");
    this.createDirectory(dirname);
    ev.preventDefault();
  }
});
