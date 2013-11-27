{dependency name="utils.dust"}
{dependency name="utils.template"}
{dependency name="ui.progressbar"}
{dependency name="ui.treeview"}
{dependency name="ui.list"}
{dependency name="filehost.ext.resize"}
{dependency name="filehost.ext.md5"}
{dependency name="filehost.image"}
{dependency name="filehost.directories"}
{dependency name="filehost.files"}
{dependency name="filehost.upload"}

<form data-elation-component="filehost.upload" action="/filehost/upload" method="post">
  <data class="elation-args" name="directories">{jsonencode var=$directories}</data>
  <data class="elation-args" name="files">{jsonencode var=$files}</data>
  {*
  {component name="filehost.directories"}
  <input type="file" name="upload" />
  <button>Upload</button>
  {component name="filehost.files"}
  *}
</form>
