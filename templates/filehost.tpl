{dependency name="user"}
{dependency name="user.auth"}
{dependency name="utils.dust"}
{dependency name="utils.template"}
{dependency name="ui"}
{dependency name="ui.progressbar"}
{dependency name="ui.button"}
{dependency name="ui.buttonbar"}
{dependency name="ui.treeview"}
{dependency name="ui.list"}
{dependency name="ui.select"}
{dependency name="ui.input"}
{dependency name="ui.label"}
{dependency name="ui.panel"}
{dependency name="ui.spinner"}
{dependency name="filehost"}
{dependency name="filehost.ext.resize"}
{dependency name="filehost.ext.md5"}
{dependency name="filehost.directorytree"}
{dependency name="filehost.filelist"}
{dependency name="filehost.file"}
{dependency name="filehost.upload"}

{set var="page.title"}File Manager{if !empty($dirname)} - {$dirname}{/if}{/set}

{component name="user.init"}

<form data-elation-component="filehost.upload" action="/filehost/upload" method="post">
  <data class="elation-args" name="directories">{jsonencode var=$directories}</data>
  <data class="elation-args" name="files">{jsonencode var=$files}</data>
</form>
