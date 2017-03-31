// ==UserScript==
// @name           Pixiv Download Helper
// @namespace      https://greasyfork.org/scripts/4555
// @description    Turns thumbnail titles into direct or mode=manga links, adds direct image links on mode=manga pages, replaces the medium thumbnail on mode=medium pages with the full size, and disables lazy-loading images.
// @include        http://www.pixiv.net/*
// @grant          GM_xmlhttpRequest
// @connect        i.pximg.net
// @connect        i1.pixiv.net
// @connect        i2.pixiv.net
// @connect        i3.pixiv.net
// @connect        i4.pixiv.net
// @connect        i5.pixiv.net
// @version        2016.12.10
// ==/UserScript==

//Turn thumbnail titles into direct links (single images) or mode=manga links.  Some kinds of thumbnails aren't covered, and an isolated few (like #17099702) don't work.
var directTitles = false;

//Append direct links below images on mode=manga pages
var directManga = true;

//Force pixiv's 'book view' style for manga sequences to something like the normal view.  Clicking a page won't scroll the window to the next page.
var breakBookView = false;

//Replace the medium thumbnail on mode=medium pages with the full size.  The image will be relinked to the full size regardless of this setting.
var fullSizeMedium = true;

//Disable lazy loading images.  These appear on mode=manga pages, rankings, and the "Recommended" section of the bookmarks page.
var dontSayLazy = true;

//----------------------------------------------------------------//

var fullSizeWidth = "740px";

if( typeof(custom) != "undefined" )
    custom();

if( location.search.indexOf("mode=manga_big") > 0 || location.search.indexOf("mode=big") > 0 )
{
    //Make the 'big'/'manga_big' image link to itself instead of closing the window
    console.log("Mode=manga_big");
    var image = document.getElementsByTagName("img")[0];
    if( image )
    {
        var link = document.createElement("a");
        link.href = image.src;
        link.appendChild( document.createElement("img") ).src = image.src;
        document.body.innerHTML = "";
        document.body.appendChild( link );
    }
}
else if( location.search.indexOf("mode=manga") > 0 )
{
    console.log("Mode=manga");
    var container = document.getElementsByClassName("full-size-container");
    if( directManga && container.length )
    {
        //Check the mode=manga_big page for the first page, since the sample extension is always "jpg".
        var req = new XMLHttpRequest();
        req.open( "GET", location.href.replace(/page=\d+&?/,'').replace('mode=manga','mode=manga_big&page=0'), true );
        req.onload = function()
        {
            console.log("Pixiv Download Helper Patch ver 0.1 by SgDylan.");
            console.log("开始各项准备！");
            console.log("准备下载链接中...");
            var firstImage = req.responseXML.querySelector("img[src*='_p0.']").src;
            for( var i = 0; i < container.length; i++ )
            {
                console.log("获取链接中...");
                var sourcePictureLink = firstImage.replace( "_p0.", "_p"+i+"." );
                var extName = "." + sourcePictureLink.split(".").pop(-1);
                var FileName = "[" + document.getElementsByClassName("breadcrumbs")[0].children[1].children[0].innerHTML.split(">")[1];
                FileName += "][" + document.getElementsByClassName("breadcrumbs")[0].children[2].children[0].children[0].innerHTML + "][" + i + "]" + extName;
                console.log("文件名："+FileName);
                console.log("链接为："+sourcePictureLink);
                console.log("放置未处理链接");
                var link = document.createElement("a");
                link.textContent = "下载请使用右键“链接另存为”保存，文件名："+FileName;
                link.style.display = "block";
                link.href = sourcePictureLink;
                link.download = FileName;
                container[i].parentNode.appendChild( link );
            }
            console.log("准备工作完成！");
        };
        req.responseType = "document";
        req.send(null);
    }
    else if( breakBookView && document.head.innerHTML.indexOf("pixiv.context.images") > 0 )
    {
        //Book view (e.g. #54139174, #57045668)

        console.log("Mode=bookview");
        var mangaSection = document.createElement("section");
        mangaSection.className = "manga";
        
        var scripts = document.head.getElementsByTagName("script");
        var hits = 0;
        for( var i = 0; i < scripts.length; i++ )
        {
            var urls = scripts[i].innerHTML.match( /pixiv.context.images[^"]+"([^"]+)".*pixiv.context.originalImages[^"]+"([^"]+)"/ );
            if( urls )
            {
                var full = urls[2].replace( /\\\//g, "/");
                mangaSection.innerHTML += '<div class="item-container"><a href="'+full+'" class="full-size-container"><i class="_icon-20 _icon-full-size"></i></a><img style="width:auto;height:auto;max-width:1200px;max-height:1200px" src="'+full+'" class="image">'+( directManga ? '<a href="'+full+'" style="display:block">direct link</a>' : '' )+'</div>';
                hits++;
            }
        }
        
        if( hits > 0 )
        {
            var sheet = document.createElement("link");
            sheet.setAttribute("rel","stylesheet");
            sheet.setAttribute("href","http://source.pixiv.net/www/css/member_illust_manga.css");
            document.head.appendChild( sheet );
            document.getElementsByTagName("html")[0].className = "verticaltext no-textcombine no-ie";
            document.body.innerHTML = "";
            document.body.appendChild( mangaSection );
        }
    }
}
else if( window == window.top )//not inside iframe
{
    if( directTitles )
    {
        //Link dem titles.
        linkThumbTitles([document]);
        new MutationObserver( function(mutationSet)
        {
            mutationSet.forEach( function(mutation){ linkThumbTitles( mutation.addedNodes ); } );
        }).observe( document.body, { childList:true, subtree:true } );
    }
    
    var worksDisplay = document.getElementsByClassName("works_display")[0];
    if( worksDisplay )
    {
        var mainImage, fullsizeSrc = 0, mainLink = worksDisplay.querySelector("a[href*='mode=']");
        if( mainLink )
            mainLink.removeAttribute('target');//Make link open in same window
        
        var oClass = document.getElementsByClassName("original-image");
        var downloadButton = document.getElementsByClassName("bookmark-container")[0];
        if( oClass.length == 1 )//47235071
        {
            var worksDiv = worksDisplay.getElementsByTagName("div")[0];
            worksDisplay.removeChild( worksDiv );//Need to remove instead of hide to prevent double source search links in other script
            var link = worksDisplay.insertBefore( document.createElement("a"), worksDisplay.firstChild );
            mainImage = link.appendChild( fullSizeMedium ? document.createElement("img") : worksDiv.getElementsByTagName("img")[0] );
            fullsizeSrc = link.href = oClass[0].getAttribute("data-src");
            //Add button to page
            if( fullSizeMedium )
            {
                console.log("Pixiv Download Helper Patch ver 0.1 by SgDylan.");
                console.log("开始各项准备！");
                var dButton0 = downloadButton.insertBefore( document.createElement("a"), downloadButton.firstChild );
                var dButton1 = downloadButton.insertBefore( document.createElement("a"), downloadButton.firstChild );
                console.log("获取链接中...");
                var sourcePictureLink = oClass[0].getAttribute("data-src");
                var extName = "." + sourcePictureLink.split(".").pop(-1);
                var FileName = "[" + document.getElementsByClassName("user")[0].innerHTML;
                FileName += "][" + document.getElementsByClassName("title")[2].innerHTML + "]" + extName;
                console.log("文件名："+FileName);
                console.log("链接为："+sourcePictureLink);
                console.log("准备‘使用右键链接另存为’按钮");
                dButton0.className = "add-bookmark _button";
                dButton0.innerHTML = "使用右键链接另存为";
                dButton0.download = FileName;
                dButton0.href = sourcePictureLink;
                console.log("准备‘使用右键链接另存为’按钮 - 完成！");
                console.log("准备‘直接下载’按钮");
                console.log("准备下载文件中...");
                GM_xmlhttpRequest({
                    method: "GET",
                    url: sourcePictureLink,
                    responseType: "blob",
                    onload: function(response){
                        dButton1.className = "add-bookmark _button";
                        dButton1.innerHTML = "直接下载";
                        dButton1.download = FileName;
                        dButton1.href = URL.createObjectURL(response.response);
                        console.log("准备‘直接下载’按钮 - 完成！");
                        console.log("准备工作完成！");
                    }
                });
            }
        }
        else if( mainLink && mainLink.href.indexOf("mode=big") > 0 && (mainImage = mainLink.getElementsByTagName("img")[0]) !== null )//17099702
        {
            //New thumbnails are always jpg, need to query mode=big page to get the right file extension.
            console.log("Mode=big");
            var req = new XMLHttpRequest();
            req.open( "GET", mainLink.href, true );
            req.onload = function()
            {
                mainLink.href = req.responseXML.getElementsByTagName("img")[0].src;
                if( fullSizeMedium )
                    mainImage.src = mainLink.href;
            }
            req.responseType = "document";
            req.send(null);
        }
        
        if( mainImage && fullSizeMedium )
        {
            if( fullsizeSrc )
                mainImage.src = fullsizeSrc;
            mainImage.setAttribute("style", "max-width: "+fullSizeWidth+"; height: auto; width: auto;");
            worksDisplay.style.width = fullSizeWidth;
        }
    }
}

if( dontSayLazy && unlazyImage() && window == window.top )
{
    //Initial page has lazy images; listen for more images added later
    new MutationObserver( function(mutationSet)
    {
        mutationSet.forEach( function(mutation)
        {
            for( var i = 0; i < mutation.addedNodes; i++ )
                unlazyImage( mutation.addedNodes[i] );
        } );
    }).observe( document.body, { childList:true, subtree:true } );
}


//----------------------------------------------------------------//

function unlazyImage(target)
{
    var images = ( target || document ).querySelectorAll("img[data-src]");
    for( var i = 0; i < images.length; i++ )
        images[i].src = images[i].getAttribute("data-src");
    return images.length;
}

function pushTitleLink(list, link)
{
    var matcher;
    if( link && link.href && (matcher = link.href.match(/illust_id=(\d+)/)) && matcher[1] > 0 )
        list.push({ "id": matcher[1], "link": link });
}

function linkThumbTitles(targets)
{
    var titleList = [];
    
    for( var i = 0; i < targets.length; i++ )
    {
        //search.php, bookmark.php, member_illust.php, new_illust.php, member.php (uploads), mypage.php (new works)
        var foundTitle = targets[i].querySelectorAll("a[href*='mode=medium'][href*='illust_id='] > .title");
        for( var j = 0; j < foundTitle.length; j++ )
            pushTitleLink( titleList, foundTitle[j].parentNode );
        
        //ranking.php
        foundTitle = targets[i].querySelectorAll(".ranking-item a.title[href*='mode=medium'][href*='illust_id=']");
        for( var j = 0; j < foundTitle.length; j++ )
            pushTitleLink( titleList, foundTitle[j] );
        
        //member_illust.php (what image was responding to)
        foundTitle = targets[i].querySelector(".worksImageresponseInfo a.response-out-work[href*='mode=medium'][href*='illust_id=']");
        if( foundTitle )
            pushTitleLink( titleList, foundTitle );
        
        //response.php, member_illust.php (before/after thumbnails), ?member.php (bookmarks)?
        var image = targets[i].querySelectorAll("li a[href*='mode=medium'][href*='illust_id='] img");
        for( var j = 0; j < image.length; j++ )
        {
            var page, title;
            for( page = image[j].parentNode; page.tagName != "A"; page = page.parentNode );
            
            //The prev/next thumbnails on mode=medium pages have text before/after the image.  Text also follows the image on image responses listings.
            if( !(title = page.getElementsByClassName("title")[0]) && (title = page.lastChild).nodeName != '#text' && (title = page.firstChild).nodeName != '#text' )
                continue;//Can't find title element
            
            //Start title link at mode=medium and change later.
            var titleLink = document.createElement("a");
            titleLink.href = page.href;
            titleLink.style.color = "#333333";//Style used on some pages
            
            //Move the title out of the thumbnail link
            page.removeChild(title);
            titleLink.appendChild(title);
            page.parentNode.insertBefore( titleLink, page.nextSibling );
            
            pushTitleLink( titleList, titleLink );
        }
    }
    
    for( var i = 0; i < titleList.length; i++ )
        directLinkSingle( titleList[i] );
}

//Query an image's mode=medium page.
function directLinkSingle(title)
{
    var req = new XMLHttpRequest();
    req.open( "GET", "http://www.pixiv.net/member_illust.php?mode=medium&illust_id="+title.id, true );
    req.onload = function()
    {
        var select = req.responseXML.getElementsByClassName("original-image");
        if( select.length == 1 )
            title.link.href = select[0].getAttribute("data-src");
        else if( (select = req.responseXML.querySelector(".works_display a[href*='mode=manga']")) !== null )
        {
            title.link.href = select.href;
            var page = req.responseXML.querySelectorAll("ul.meta li")[1].textContent.match(/(\d+)P$/);
            if( page )
                ( title.link.firstChild.nodeName == '#text' ? title.link : title.link.firstChild ).title += " ("+page[1]+" pages)";
        }
    };
    req.responseType = "document";
    req.send(null);
}
