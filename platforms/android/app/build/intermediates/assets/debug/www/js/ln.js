/**
* Unicode code converter: https://r12a.github.io/app-conversion/.
* ISO 639-1 codes: http://en.wikipedia.org/wiki/List_of_ISO_639-1_codes.
*/
var ln = {
  language: "en",
  init: function() {
    i18n.init({
      ns: "general",
      lng: "en",
      resGetPath: "locales/__ns__.__lng__.json",
      fallbackLng: "en",
      useCookie: false
    }, function() {
      ln.getLanguage();
    });
  },
  getLanguage: function() {
    navigator.globalization.getLocaleName(
      function(lang) {
        ln.language = lang.value.substring(0, 2);
        i18n.setLng(ln.language, function(error, t) {
          $("body").i18n();
        });

        afterLangInit();
      },
      function(error) {
        console.log(error);
      }
    );
  }
};
