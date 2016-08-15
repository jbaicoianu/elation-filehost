elation.require(['ui.base'], function() {
  elation.component.add('filehost.filelist', function() {
    this.init = function() {
      elation.html.addclass(this.container, 'filehost_filelist');
      this.directory = this.args.directory || false;

      var sortargs = { sortby: 'filename', sortreverse: false };
      if (this.directory && this.directory.metadata) {
        if (this.directory.metadata.sortby) sortargs.sortby = this.directory.metadata.sortby;
        if (this.directory.metadata.sortreverse) sortargs.sortreverse = this.directory.metadata.sortreverse;
      }

      if (this.args.files) {
        this.header = elation.ui.panel(null, elation.html.create({append: this.container}), {orientation: 'horizontal', classname: 'filehost_filelist_commands'});
        //this.viewselect = this.header.add(elation.ui.select(null, elation.html.create(), { label: 'View', items: 'details;list;slideshow' }, { "ui_select_change": elation.bind(this, this.processViewChange)}));
        this.sortbyselect = this.header.add(elation.ui.select(null, elation.html.create(), { label: 'Sort by', items: 'filename;filetype;filesize;modified_time', selected: sortargs.sortby }, { "ui_select_change": elation.bind(this, this.processSortbyChange)}));
        this.sortorderselect = this.header.add(elation.ui.select(null, elation.html.create(), { items: 'ascending;descending', selected: (sortargs.sortreverse ? 'descending' : 'ascending') }, { "ui_select_change": elation.bind(this, this.processSortbyChange)}));

        this.list = elation.ui.list(null, elation.html.create({append: this.container}), {orientation: 'inline', sortbydefault: sortargs.sortby, sortorderdefault: sortargs.sortreverse});

        this.updateFiles(this.args.files);
      }
      this.setView(this.args.view || 'details');
    }
    this.setDirectory = function(dirname) {
      this.dirname = dirname;
      elation.ajax.Get("/filehost/files.js?dirname=" + dirname, null, {
        callback: elation.bind(this, this.processDirectoryChange)
      });
    }
    this.setView = function(view) {
      if (this.view) {
        this.removeclass('ui_list_view_' + this.view);
      }
      this.view = view;
      this.addclass('ui_list_view_' + this.view);
    }
    this.updateFiles = function(files) {
      this.files = files;
      var items = [];
      for (var k in files) {
        items.push(elation.filehost.file(null, elation.html.create(), files[k]));
      }
      this.list.setItems(items);
    }
    this.processDirectoryChange = function(jsonstr) {
      var response = JSON.parse(jsonstr);
      var data = response.data;
      if (data.files) {
        this.updateFiles(data.files);
      }
    }
    this.processSortbyChange = function(ev) {
      this.list.sort(this.sortbyselect.value, (this.sortorderselect.value == 'descending'));
    }
    this.processViewChange = function(ev) {
      console.log('set view to ' + ev.data, this.list);
      this.list.setOrientation(ev.data);
    }
  }, elation.ui.base);
});
