(function () {
  /* globals chrome */
  'use strict';
  
  const imageDownloader = {
    title: undefined,

    findTitle() {
      if (this.title) return this.title;
      let title = document.querySelectorAll('#mod-detail-title .d-title');
      this.title = title[0].textContent;
      return this.title;
    },


    findSkuSize(){
      let sku = document.querySelectorAll('.table-sku .name span');
      let skus = [];
      for(let i = 0,len=sku.length;i<len;i++){
        let s = sku[i];
        skus.push(s.innerText)
      }
      return skus;
    },

    findColors(){
      let colorsElm = document.querySelectorAll('.list-leading a');
      let colors = [];
      for(let i = 0,len=colorsElm.length;i<len;i++){
        let s = colorsElm[i];
        colors.push(s.title)
      }
      return colors;
    },

    // Source: https://support.google.com/webmasters/answer/2598805?hl=en
    //imageRegex: /(?:([^:\/?#]+):)?(?:\/\/([^\/?#]*))?([^?#]*\.(?:bmp|gif|jpe?g|png|svg|webp))(?:\?([^#]*))?(?:#(.*))?/i,
    imageRegex: /(?:([^:\/?#]+):)?(?:\/\/([^\/?#]*))?([^?#]*\.(?:bmp|gif|jpe?g|png|svg|webp))(?:\?([^#]*))?(?:#(.*))?/i,

    extractImagesFromTags() {
     
      //'img, a, [style]'
      //#dt-tab img, #desc-lazyload-container img
      return [].slice.apply(document.querySelectorAll('#dt-tab img, #desc-lazyload-container img')).map(imageDownloader.extractImageFromElement);
    },

    extractImagesFromStyles() {
      const imagesFromStyles = [];
      for (let i = 0; i < document.styleSheets.length; i++) {
        const styleSheet = document.styleSheets[i];
        // Prevents `Failed to read the 'cssRules' property from 'CSSStyleSheet': Cannot access rules` error. Also see:
        // https://github.com/vdsabev/image-downloader/issues/37
        // https://github.com/odoo/odoo/issues/22517
        if (styleSheet.hasOwnProperty('cssRules')) {
          const { cssRules } = styleSheet;
          for (let j = 0; j < cssRules.length; j++) {
            const style = cssRules[j].style;
            if (style && style.backgroundImage) {
              const url = imageDownloader.extractURLFromStyle(style.backgroundImage);
              if (imageDownloader.isImageURL(url)) {
                imagesFromStyles.push(url);
              }
            }
          }
        }
      }

      return imagesFromStyles;
    },





    extractImageFromElement(element) {
      if (element.tagName.toLowerCase() === 'img') {
        let src = element.src;
        const hashIndex = src.indexOf('#');
        if (hashIndex >= 0) {
          src = src.substr(0, hashIndex);
        }
        if(src.indexOf('lazyload.png')===-1){
          return src;
        }
      }

      if (element.tagName.toLowerCase() === 'a') {
        const href = element.href;
        if (imageDownloader.isImageURL(href)) {
          imageDownloader.linkedImages[href] = '0';
          return href;
        }
      }

      const backgroundImage = window.getComputedStyle(element).backgroundImage;
      if (backgroundImage) {
        const parsedURL = imageDownloader.extractURLFromStyle(backgroundImage);
        if (imageDownloader.isImageURL(parsedURL)) {
          return parsedURL;
        }
      }

      return '';
    },

    extractURLFromStyle(url) {
      return url.replace(/^url\(["']?/, '').replace(/["']?\)$/, '');
    },

    isImageURL(url) {
      return url.indexOf('data:image') === 0 || imageDownloader.imageRegex.test(url);
    },

    relativeUrlToAbsolute(url) {
      return url.indexOf('/') === 0 ? `${window.location.origin}${url}` : url;
    },

    removeDuplicateOrEmpty(images) {
      const hash = {};
      for (let i = 0; i < images.length; i++) {
        hash[images[i]] = 0;
      }

      const result = [];
      for (let key in hash) {
        if (key !== '') {
          result.push(key.replace(/.[0-9]+x[0-9]+/,''));
        }
      }

      return result;
    }
  };
  window.scrollTo(0,document.body.scrollHeight)
  setTimeout(function(){
    imageDownloader.title = imageDownloader.findTitle();

    imageDownloader.linkedImages = {}; // TODO: Avoid mutating this object in `extractImageFromElement`
    imageDownloader.images = imageDownloader.removeDuplicateOrEmpty(
      [].concat(
        imageDownloader.extractImagesFromTags(),
        //imageDownloader.extractImagesFromStyles()
      ).map(imageDownloader.relativeUrlToAbsolute)
    );
  
    chrome.runtime.sendMessage({
      linkedImages: imageDownloader.linkedImages,
      images: imageDownloader.images,
      title: imageDownloader.title,
      skus: imageDownloader.findSkuSize(),
      colors:imageDownloader.findColors(),
    });
  
    imageDownloader.linkedImages = null;
    imageDownloader.images = null;
    window.scrollTo(0,0)
  },1000)
 
}());
