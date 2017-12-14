var map;
var bing;
var osm;
var markersMy, markersAll;
var marker;

// initial values
var curLatLng = [0, 0],
curLatLngAccuracy = 0;
var classification = "",
image = "",
certainty = 3,
comment= "";

var networkState;
var legendHeight;

function afterLangInit() {

  var uuid = device.uuid;
  if (uuid == null)
    uuid = new Fingerprint().get().toString() + "-PC";

  networkState = navigator.connection.type;

  // pouchdb & couchdb settings
  var localDB = new PouchDB("db_local", {auto_compaction:true});
  var remoteUsersDB = new PouchDB(SETTINGS.db_users_url, {size: 100});
  var remotePointsDB = new PouchDB(SETTINGS.db_points_url, {size: 100});
  var opts = {live: true};
  function syncError(err) {
    console.log("sync error: " + err);
  }
  if (SETTINGS.db_points_url)
    localDB.replicate.to(SETTINGS.db_points_url, opts, syncError);

  bing = new L.tileLayer.bing("AqSfYcbsnUwaN_5NvJfoNgNnsBfo1lYuRUKsiVdS5wQP3gMX6x8xuzrjZkWMcJQ1", {type: "AerialWithLabels"});

  osm = L.tileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; <a href='http://osm.org/copyright'>OpenStreetMap</a> contributors",
    errorTileUrl:"como_tiles/errorTile.png"
  });

  $("#bing").click(function() {
    if (networkState == Connection.NONE || navigator.onLine == false)
      navigator.notification.alert(i18n.t("messages.bingNoInternet"), null, "GlobeLand30 Validation", i18n.t("messages.ok"));
    else {
      map.removeLayer(osm);
      map.addLayer(bing);
    }
  });

  $("#osm").click(function() {
    if (networkState == Connection.NONE || navigator.onLine == false)
      navigator.notification.alert(i18n.t("messages.osmNoInternet"), null, "GlobeLand30 Validation", i18n.t("messages.ok"));
    else {
      if (map.hasLayer(bing))
        map.removeLayer(bing);
      if (!map.hasLayer(osm))
      map.addLayer(osm);
    }
  });

  function setMarkerClassIcon(classPOI) {
    function getClassImage(classPOI) {
      if (classPOI == null || classPOI == undefined) {
        return "";
      }
      return  "<img id='class-blue-marker' src='img/classes/" + classPOI + "WhiteBackground.png'>";
    }
    var icon = L.divIcon({
      iconSize: [54, 85],
      iconAnchor: [27, 97],
      popupAnchor: [0, -85],
      html: getClassImage(classPOI) + "<img id='blue-marker' src='img/markerBlue.png'>"
    });
    return icon;
  }

  marker = L.marker(curLatLng, {icon: setMarkerClassIcon(), draggable: false});

  marker.on("dragend", function(event) {
    var latLng = event.target.getLatLng();
    curLatLng = [latLng.lat, latLng.lng];
    curLatLngAccuracy = 0;
  });

  L.DomEvent.disableClickPropagation(L.DomUtil.get("legend-button"));
  L.DomEvent.disableScrollPropagation(L.DomUtil.get("legend-button"));
  L.DomEvent.disableClickPropagation(L.DomUtil.get("legend"));
  L.DomEvent.disableScrollPropagation(L.DomUtil.get("legend"));

  $("#navbar-registration").click(function() {
    $("#start-about").hide();
    $("#registration").show();
  });

  $("#navbar-start-about").click(function() {
    $("#registration").hide();
    $("#start-about").show();
  });

  $("#register").click(function() {
    function registrationSuccess() {
      $("#start-page").hide();
      $("#main-page").show();
      onResize();

      map = L.map("map", {
        center: curLatLng,
        zoom: 3
      });
      osm.addTo(map);
      marker.addTo(map);

      window.localStorage.setItem("isLaunch",true);
    }

    var gender = $("#gender").val();
    var age = $("#age").val();
    var workstatus = $("#workstatus").val();

    if (networkState == Connection.NONE || navigator.onLine == false) {
      navigator.notification.alert(i18n.t("messages.registrationNoInternet"), null, "GlobeLand30 Validation", i18n.t("messages.ok"));
      return;
    }

    if(gender == null || age == null || workstatus == null) {
      navigator.notification.alert(i18n.t("messages.registrationFormEmpty"), null, "GlobeLand30 Validation", i18n.t("messages.ok"));
      return;
    }

    // register user
    var timestamp= new Date().toISOString();
    remoteUsersDB.get(uuid).then(function (doc) {
      // if exists, update the user
      var user = {
        _id: uuid,
        _rev: doc._rev,
        timestamp: timestamp,
        gender: gender,
        age: age,
        workstatus: workstatus
      };
      remoteUsersDB.put(user, function callback(err, result) {
        if (!err)
          navigator.notification.alert(i18n.t("messages.registrationSuccess"), registrationSuccess, "GlobeLand30 Validation", i18n.t("messages.ok"));
        else
          navigator.notification.alert(i18n.t("messages.error") + " " + err, null, "GlobeLand30 Validation", i18n.t("messages.ok"));
      });
    }).catch(function (err) {
      // if not exists, add the user
      var user = {
        _id: uuid,
        timestamp: timestamp,
        gender: gender,
        age: age,
        workstatus: workstatus
      };
      remoteUsersDB.put(user, function callback(err, result) {
        if (!err)
          navigator.notification.alert(i18n.t("messages.registrationSuccess"), registrationSuccess, "GlobeLand30 Validation", i18n.t("messages.ok"));
        else
          navigator.notification.alert(i18n.t("messages.error") + " " + err, null, "GlobeLand30 Validation", i18n.t("messages.ok"));
      });
    });
  });

  // check whether it is the first time launch
  if (window.localStorage.getItem("isLaunch")) {
    $("#start-page").hide();
    $("#main-page").show();
    onResize();

    map = L.map("map", {
      center: curLatLng,
      zoom: 3
    });
    osm.addTo(map);
    marker.addTo(map);
  }
  else {
    $("#start-page").show();
    $("#main-page").hide();
  }

  $("#navbar-add").click(function() {
    $("#map, #add-menu").show();
    $("#main-about, #mymap-stat, #allmap-stat, #legend-button, #legend").hide();

    if (markersAll) {
      for (var i=0; i<markersAll.length; i++) {
        map.removeLayer(markersAll[i]);
      }
    }
    if (markersMy) {
      for (var i=0; i<markersMy.length; i++) {
        map.removeLayer(markersMy[i]);
      }
    }
    if (!map.hasLayer(marker))
      map.addLayer(marker);
  });

  $("#add-menu-start").click(function() {
    $("#add-menu").hide();
    $("#classes-menu").show();
    $("#class-next, #certainty-next").addClass("ui-disabled");
    $("#navbar-add, #navbar-my, #navbar-all, #navbar-main-about").addClass("ui-disabled");

    var app = document.URL.indexOf("http://") === -1 && document.URL.indexOf("https://") === -1;
    if (app)
      $("#input-file, #choose-photo").remove();
    else
      $("#take-photo").remove();

    $("#classes-menu-list").css("overflow-y", "scroll");

    // set all forms to initial values
    $("#radio-choice-1, #radio-choice-2, #radio-choice-3, #radio-choice-4, #radio-choice-5, #radio-choice-6, #radio-choice-7, #radio-choice-8, #radio-choice-9, #radio-choice-10").prop("checked",false).checkboxradio("refresh");
    $("#classes-select").text(i18n.t("menu.classes.select"));
    $("#comment-input").val("");
    $("#slider").val(3).slider("refresh");

    if(navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        function(position) {
          curLatLng = [position.coords.latitude, position.coords.longitude];
          curLatLngAccuracy = position.coords.accuracy;
          map.panTo(curLatLng);
          marker.setLatLng (curLatLng);
          marker.bindPopup(i18n.t("messages.markerPopup")).openPopup();
          marker.dragging.enable();
        },
        function(error) {
          marker.bindPopup(i18n.t("messages.gpsError")).openPopup();
          marker.dragging.enable();
        },
        {maximumAge: 3000, timeout: 5000, enableHighAccuracy: true}
      );
    }

    // set all initial values
    classification = "";
    image = "";
    certainty = 3;
    comment= "";
  });

  $("#navbar-my").click(function() {
    $("#main-about, #add-menu, #allmap-stat, #legend").hide();
    $("#map, #legend-button").show();

    if (markersAll) {
      for (var i=0; i<markersAll.length; i++) {
        map.removeLayer(markersAll[i]);
      }
    }
    if (markersMy) {
      for (var i=0; i<markersMy.length; i++) {
        map.removeLayer(markersMy[i]);
      }
    }

    if (map.hasLayer(marker))
      map.removeLayer(marker);

    map.panTo(curLatLng);
    marker.setLatLng (curLatLng);

    // read data from the local database
    localDB.allDocs({include_docs: true}, function(err, doc) {
      if(err) {
        navigator.notification.alert(i18n.t("messages.privateMode"), null, "GlobeLand30 Validation", i18n.t("messages.ok"));
        return;
      }
      else {
        var ids=[];
        var timestamps=[];
        var locations=[];
        var classes=[];
        var certainties=[];
        var comments=[];
        var imageLengths=[];
        var count=0;
        doc.rows.forEach(function(todo) {
          if(todo.doc.location!=null&&todo.doc.classification!=null) {
            ids.push(todo.doc._id);
            timestamps.push(todo.doc.timestamp);
            locations.push(todo.doc.location);
            classes.push(todo.doc.classification);
            certainties.push(todo.doc.certainty);
            comments.push(todo.doc.comment);
            imageLengths.push(todo.doc._attachments["image.jpg"].length);
            count++;
          }
        });

        markersMy = vizPOIs(map, ids, timestamps, locations, classes, certainties, comments, imageLengths);
        if (count == 0)
          $("#mymap-stat").html(i18n.t("stat.noContrMy") +"<br><br>");
        else if (count == 1)
          $("#mymap-stat").html(i18n.t("stat.totalMy") + count + i18n.t("stat.contrMySingle") + "<br><br>");
        else
          $("#mymap-stat").html(i18n.t("stat.totalMy") + count + i18n.t("stat.contrMyPlural") + "<br><br>");

        $("#mymap-stat").show();
      }
    });
  });

  $("#navbar-all").click(function() {
    $("#main-about, #add-menu, #mymap-stat, #legend").hide();
    $("#map, #legend-button").show();

    if (markersAll) {
      for (var i=0; i<markersAll.length; i++) {
        map.removeLayer(markersAll[i]);
      }
    }
    if (markersMy) {
      for (var i=0; i<markersMy.length; i++) {
        map.removeLayer(markersMy[i]);
      }
    }

    if (map.hasLayer(marker))
      map.removeLayer(marker);

    map.panTo(curLatLng);
    marker.setLatLng (curLatLng);

    if (networkState == Connection.NONE || navigator.onLine == false) {
      navigator.notification.alert(i18n.t("messages.allNoInternet"), null, "GlobeLand30 Validation", i18n.t("messages.ok"));
      return;
    }
    else {
      // read data from the server database
      remotePointsDB.allDocs({include_docs: true}, function(err, doc) {
        if(err) {
          navigator.notification.alert(i18n.t("messages.error"), null, "GlobeLand30 Validation", i18n.t("messages.ok"));
          return;
        }
        else {
          var ids=[];
          var timestamps=[];
          var locations=[];
          var classes=[];
          var certainties=[];
          var comments=[];
          var imageLengths=[];
          var count=0;
          doc.rows.forEach(function(todo) {
            if(todo.doc.location!=null&&todo.doc.classification!=null) {
              ids.push(todo.doc._id);
              locations.push(todo.doc.location);
              timestamps.push(todo.doc.timestamp);
              classes.push(todo.doc.classification);
              certainties.push(todo.doc.certainty);
              comments.push(todo.doc.comment);
              imageLengths.push(todo.doc._attachments["image.jpg"].length);
              count++;
            }
          });

          markersAll = vizPOIs(map, ids, timestamps, locations, classes, certainties, comments, imageLengths);

          var count = 0;
          var dist;
          var curLatLngL = L.latLng(curLatLng[0], curLatLng[1]);
          for (var i = 0; i < ids.length; i++) {
            dist = curLatLngL.distanceTo(L.latLng(locations[i][0], locations[i][1]));
            if(dist <= 5000) {
              count++;
            }
          }
          if (count == 0)
            $("#allmap-stat").html(i18n.t("stat.noContrAll") +"<br/><br/>");
          else if (count == 1)
            $("#allmap-stat").html(i18n.t("stat.totalAllSingle") + count + i18n.t("stat.contrAllSingle") + "<br><br>");
          else
            $("#allmap-stat").html(i18n.t("stat.totalAllPlural") + count + i18n.t("stat.contrAllPlural") + "<br><br>");

          $("#allmap-stat").show();
        }
      });
    }
  });

  $("#navbar-main-about").click(function() {
    $("#add-menu, #mymap-stat, #allmap-stat, #map").hide();
    $("#main-about").show();
  });

  $("#class-cancel").click(function() {
    $("#add-menu").show();
    $("#classes-menu").hide();
    $("#navbar-add, #navbar-my, #navbar-all, #navbar-main-about").removeClass("ui-disabled");
    marker.setIcon(setMarkerClassIcon());
    marker.dragging.disable();
  });

  $("#class-next").click(function() {
    $("#classes-menu").hide();
    $("#certainty-slider").show();
  });

  $("#certainty-back").click(function() {
    $("#certainty-slider").hide();
    $("#classes-menu").show();
  });

  $("#certainty-next").click(function() {
    $("#certainty-slider").hide();
    $("#comment").show();
  });

  $("#comment-back").click(function() {
    $("#comment").hide();
    $("#certainty-slider").show();
  });

  $("#comment-next").click(function() {
    comment =  $("#comment-input").val();
    $("#comment").hide();
    $("#photo").show();
  });

  $("#photo-back").click(function() {
    $("#photo").hide();
    $("#comment").show();
  });

  $("#photo-next").click(function() {
    $("#photo").hide();
    $("#navbar-add, #navbar-my, #navbar-all, #navbar-main-about").removeClass("ui-disabled");

    var timestamp = new Date().toISOString();
    var poi = {
      _id: timestamp,
      user: uuid,
      location: curLatLng,
      locationAccuracy: curLatLngAccuracy,
      lang: ln.language.code,
      timestamp: timestamp,
      classification: classification,
      certainty: certainty,
      comment: comment,
      _attachments:
      {
        "image.jpg":
        {
          content_type:"image\/jpeg",
          data: image
        }
      }
    };

    localDB.put(poi, function callback(err, result) {
      if (!err) {
        if (networkState == Connection.NONE || navigator.onLine == false)
          navigator.notification.alert(i18n.t("messages.contributionSuccessNoInternet"), contributionSuccess, "GlobeLand30 Validation", i18n.t("messages.ok"));
        else
          navigator.notification.alert(i18n.t("messages.contributionSuccess"), contributionSuccess, "GlobeLand30 Validation", i18n.t("messages.ok"));
      }
      else
        navigator.notification.alert(i18n.t("messages.storageError"), null, "GlobeLand30 Validation", i18n.t("messages.ok"));
    });

    function contributionSuccess() {
      $("#add-menu").show();
      marker.setIcon(setMarkerClassIcon());
      marker.dragging.disable();
    }
  });

  $("#slider").bind("slidestop", function() {
    certainty = $("#slider").val();
    $("#certainty-next").removeClass("ui-disabled");
  });

  $("input[type='radio']").on("click", function() {
    classification = $(this).val();
    $("#class-next").removeClass("ui-disabled");
  });

  // close the list of classes
  $("#class-ok").click(function() {
    setTimeout(function() {
      $("#classes-menu-list").popup("close");
    }, 1);
  });

  // close the list of classes - for iPad
  $("#class-ok").on("click touchstart", function() {
    setTimeout(function() {
      $("#classes-menu-list").popup("close");
    }, 1);
  });

  // set the text on the button to the selected class
  $("#classes-menu-list").on("popupafterclose", function() {
    if (classification != "") {
      var idOfValue = $("input[value='"+classification+"']").attr("id");
      var labelFor =  $("label[for='"+idOfValue+"']").text();
      $("#classes-select").text(labelFor);
      marker.setIcon(setMarkerClassIcon(classification));
    }
  });

  // make the list of classes scrollable
  $("#classes-menu-list").on({
    popupbeforeposition: function(e) {
      var maxHeight = $(window).height() - 20;
      $("#classes-menu-list").css("max-height", maxHeight + "px");
    }
  });

  /***
  photos - beginning
  ***/
  // this function is called when the input loads an image
  function renderImage(file) {
    var reader = new FileReader();
    reader.onload = function(event) {
      var url = event.target.result;
      // console.log(url);
      image = url.substr(url.indexOf(",")+1);
      // console.log(image);
    }

    // when the file is read it triggers the onload event above
    reader.readAsDataURL(file);
  }

  // triggered when OK is clicked
  $("input[type='file']").change(function() {
    // console.log(this.files[0]);
    renderImage(this.files[0]);
  });

  function onSuccess(imageData) {
    image = imageData;
    // console.log("image is received");
    // console.log(image);
  }

  function onFail(message) {
    console.log("Failed getting photo. Message: " + message);
  }

  $("#take-photo").click(function() {
    navigator.camera.getPicture(onSuccess, onFail, {
      quality: 20,
      destinationType: Camera.DestinationType.DATA_URL,
      sourceType: Camera.PictureSourceType.CAMERA
    });
  });

  $("#choose-photo").click(function() {
    $("input[type='file']").click();
  });
  /***
  photos - end
  ***/
}

function isCommentEmpty(comment) {
  if (comment == "")
    return "";
  else
    return "<b>" + i18n.t("popup.comment") + ":</b> " + comment + "<br>";
}

function isImageEmpty(id, length) {
  if (length == 0)
    return "";
  else
    return "<br><center><img src=http://localhost:5984/glc30_points/" + id + "/image.jpg" + " width=200px></center>";
}

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

// visualizing POIs using marker cluster
function vizPOIs (map, ids, timestamps, locations, classes, certainties, comments, imageLengths) {
  var str = "";
  var markerClusters = [];
  var marker;
  var locationIcon;

  classesUnique = classes.filter(onlyUnique);

  for (var i = 0; i < classesUnique.length; i++) {
    str = "markers" + classesUnique[i].charAt(0).toUpperCase() + classesUnique[i].slice(1);
    window[str] = L.markerClusterGroup();
    markerClusters.push(window[str]);
  }

  for (i = 0; i < ids.length; i++) {
    locationIcon = L.icon({
      iconUrl: "img/classes/" + classes[i] + "WhiteBackground.png",
      iconSize: [36, 36],
      iconAnchor: [18, 36],
      popupAnchor: [0, -36]
    });
    marker = L.marker(locations[i], {icon: locationIcon});
    marker.bindPopup("<b>" + i18n.t("popup.class") + ": </b>" + i18n.t("menu.classes."+classes[i]) + "<br><b>" + i18n.t("popup.date") + ": </b>" + new Date(timestamps[i]).toLocaleString() + "<br><b>" + i18n.t("popup.certainty") + ": </b>" + certainties[i] + "<br>" + isCommentEmpty(comments[i]) + isImageEmpty(ids[i], imageLengths[i]));
    marker.mydata = classes[i];
    str = "markers" + classes[i].charAt(0).toUpperCase() + classes[i].slice(1);
    window[str].addLayer(marker);
  }

  for (i = 0; i < classes.length; i++) {
    var str = "markers" + classes[i].charAt(0).toUpperCase() + classes[i].slice(1);
    map.addLayer(window[str]);
  }

  return markerClusters;
}

function adjustLegendHeight() {
  var mapH = $("#map").height();

  if ((legendHeight+64) > mapH)
    $("#legend").css("height", (mapH-70) + "px");
  else
    $("#legend").css("height", legendHeight);
}

$("#legend-button").on("vclick", function() {
  $("#legend").toggle();
  legendHeight = $("div#legend")[0].scrollHeight;

  adjustLegendHeight();
});

function onResize() {
  // resize map to cover whole screen
  var mapEl = $("#map");
  mapEl.height($(document).height() - mapEl.offset().top);

  adjustLegendHeight();
}

function initialize() {
  ln.init();
}

function onLoad() {
  document.addEventListener("deviceready", initialize, false);
}
