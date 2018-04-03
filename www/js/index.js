var map, bing, osm, markersMy, markersAll, marker;

var networkState, watchCompassID, isApplication, compassSupported = false;

// initial values
var curLatLng = [0, 0], curLatLngAccuracy = 0;
var classification = "", photoNorth = "", photoEast = "", photoSouth = "", photoWest = "", certainty = "60%", comment= "";

function afterLangInit() {
  function addInstructions(parent, instructionText, imageIdArray, type) {
    var instruction = document.createElement("div");
    instruction.className = "instruction";
    instruction.innerHTML = instructionText;
    document.getElementById(parent + "-instructions-" + type + "s").appendChild(instruction);

    var instructionImages = document.createElement("div");

    for (var i = 0; i < imageIdArray.length; i++) {
      var image = document.createElement("img");
      image.src = "../img/screenshots/" + type + "/" + ln.language + "/" + imageIdArray[i] + ".jpg";
      instructionImages.appendChild(image);
    }

    document.getElementById(parent + "-instructions-" + type + "s").appendChild(instructionImages);
  }

  var uuid = device.uuid;
  if (uuid == null)
    uuid = new Fingerprint().get().toString() + "-PC";

  networkState = navigator.connection.type;

  // pouchdb & couchdb settings
  var localDB = new PouchDB("db_local", {auto_compaction: true});
  var remoteUsersDB = new PouchDB(SETTINGS.db_users_url, {size: 100});
  var remotePointsDB = new PouchDB(SETTINGS.db_points_url, {size: 100});
  function syncError(err) {
    console.log("sync error: " + err);
  }
  if (SETTINGS.db_points_url)
    localDB.replicate.to(SETTINGS.db_points_url, {live: true}, syncError);

  bing = new L.tileLayer.bing("AqSfYcbsnUwaN_5NvJfoNgNnsBfo1lYuRUKsiVdS5wQP3gMX6x8xuzrjZkWMcJQ1", {type: "AerialWithLabels"});

  osm = L.tileLayer("http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; <a href='http://osm.org/copyright'>OpenStreetMap</a> contributors",
    errorTileUrl: "img/errorTile.png"
  });

  $("#bing").click(function() {
    if (networkState == Connection.NONE || navigator.onLine == false)
      navigator.notification.alert(i18n.t("messages.bingNoInternet"), null, "Land Cover Collector", i18n.t("messages.ok"));
    else {
      map.removeLayer(osm);
      map.addLayer(bing);
    }
  });

  $("#osm").click(function() {
    if (networkState == Connection.NONE || navigator.onLine == false)
      navigator.notification.alert(i18n.t("messages.osmNoInternet"), null, "Land Cover Collector", i18n.t("messages.ok"));
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

  function getCurrentPosition() {
    if (navigator.geolocation) {
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
          var isAndroid = navigator.userAgent.toLowerCase().indexOf("android") && navigator.userAgent.toLowerCase().indexOf("mobile") > -1;
          if(!isAndroid)
            marker.bindPopup(i18n.t("messages.gpsError")).openPopup();
          else
            marker.bindPopup(i18n.t("messages.gpsErrorAndroid")).openPopup();

          marker.dragging.enable();
        },
        {maximumAge: 3000, timeout: 5000, enableHighAccuracy: true}
      );
    }
  }

  L.DomEvent.disableClickPropagation(L.DomUtil.get("legend-button"));
  L.DomEvent.disableScrollPropagation(L.DomUtil.get("legend-button"));
  L.DomEvent.disableClickPropagation(L.DomUtil.get("legend"));
  L.DomEvent.disableScrollPropagation(L.DomUtil.get("legend"));
  L.DomEvent.disableClickPropagation(L.DomUtil.get("guidelines"));
  L.DomEvent.disableScrollPropagation(L.DomUtil.get("guidelines"));

  $("#navbar-registration").click(function() {
    $("#start-information").hide();
    $("#registration").show();
  });

  $("#navbar-start-information").click(function() {
    $("#registration").hide();
    addInstructions("start", i18n.t("information.instructions.registration"), [1, 2, 3], "application");
    addInstructions("start", i18n.t("information.instructions.registration"), [1, 2, 3], "browser");
    addInstructions("start", i18n.t("information.instructions.location"), [4, 5], "application");
    addInstructions("start", i18n.t("information.instructions.location"), [4, 5], "browser");
    addInstructions("start", i18n.t("information.instructions.guidelines"), [6], "application");
    addInstructions("start", i18n.t("information.instructions.guidelines"), [6], "browser");
    addInstructions("start", i18n.t("information.instructions.classification"), [7, 8], "application");
    addInstructions("start", i18n.t("information.instructions.classification"), [7, 8], "browser");
    addInstructions("start", i18n.t("information.instructions.certaintyAndComment"), [9, 10], "application");
    addInstructions("start", i18n.t("information.instructions.certaintyAndComment"), [9, 10], "browser");
    addInstructions("start", i18n.t("information.instructions.takePhotoNorth"), [11, 12], "application");
    addInstructions("start", i18n.t("information.instructions.choosePhotoNorth"), [11, 12], "browser");
    addInstructions("start", i18n.t("information.instructions.takePhotoEastSouthWest"), [13, 14, 15], "application");
    addInstructions("start", i18n.t("information.instructions.choosePhotoEastSouthWest"), [13, 14, 15], "browser");
    addInstructions("start", i18n.t("information.instructions.submission"), [16, 17], "application");
    addInstructions("start", i18n.t("information.instructions.submission"), [16, 17], "browser");
    addInstructions("start", i18n.t("information.instructions.myMap"), [18, 19], "application");
    addInstructions("start", i18n.t("information.instructions.myMap"), [18, 19], "browser");
    addInstructions("start", i18n.t("information.instructions.everyone"), [20, 21], "application");
    addInstructions("start", i18n.t("information.instructions.everyone"), [20, 21], "browser");
    $("#start-information").show();
  });

  $("#register").click(function() {
    function registrationSuccess() {
      $("#start-page").hide();
      $("#main-page").show();
      $("body").css("overflow-y", "hidden");
      onResize();

      map = L.map("map", {
        center: curLatLng,
        zoom: 3
      });
      osm.addTo(map);
      marker.addTo(map);

      getCurrentPosition();

      window.localStorage.setItem("isLaunch",true);
    }

    var gender = $("#gender").val();
    var age = $("#age").val();
    var workstatus = $("#workstatus").val();

    if (networkState == Connection.NONE || navigator.onLine == false) {
      navigator.notification.alert(i18n.t("messages.registrationNoInternet"), null, "Land Cover Collector", i18n.t("messages.ok"));
      return;
    }

    if (gender == null || age == null || workstatus == null) {
      navigator.notification.alert(i18n.t("messages.registrationFormEmpty"), null, "Land Cover Collector", i18n.t("messages.ok"));
      return;
    }

    // register user
    var timestamp = new Date().toISOString();
    remoteUsersDB.get(uuid).then(function(doc) {
      // if exists, update the user
      var user = {
        _id: uuid,
        _rev: doc._rev,
        timestamp: timestamp,
        gender: gender,
        age: age,
        workstatus: workstatus
      };
      remoteUsersDB.put(user, function callback(err) {
        if (!err)
          navigator.notification.alert(i18n.t("messages.registrationSuccess"), registrationSuccess, "Land Cover Collector", i18n.t("messages.ok"));
        else
          navigator.notification.alert(i18n.t("messages.error") + " " + err, null, "Land Cover Collector", i18n.t("messages.ok"));
      });
    }).catch(function(err) {
      // if not exists, add the user
      var user = {
        _id: uuid,
        timestamp: timestamp,
        gender: gender,
        age: age,
        workstatus: workstatus
      };
      remoteUsersDB.put(user, function callback(err) {
        if (!err)
          navigator.notification.alert(i18n.t("messages.registrationSuccess"), registrationSuccess, "Land Cover Collector", i18n.t("messages.ok"));
        else
          navigator.notification.alert(i18n.t("messages.error") + " " + err, null, "Land Cover Collector", i18n.t("messages.ok"));
      });
    });
  });

  // check whether it is the first time launch
  if (window.localStorage.getItem("isLaunch")) {
    $("#start-page").hide();
    $("#main-page").show();
    $("body").css("overflow-y", "hidden");
    onResize();

    map = L.map("map", {
      center: curLatLng,
      zoom: 3
    });
    osm.addTo(map);
    marker.addTo(map);

    getCurrentPosition();
  }
  else {
    $("#start-page").show();
    $("#main-page").hide();
  }

  $("#navbar-add").click(function() {
    $("#map, #add-menu, #guidelines").show();
    $("#main-information, #mymap-stat, #allmap-stat, #legend-button, #legend").hide();
    $("body").css("overflow-y", "hidden");

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
    $("#class-next, #certainty-next, #photo-north-next, #photo-east-next, #photo-south-next, #photo-west-next, #photo-north .take-photo, #photo-east .take-photo, #photo-south .take-photo, #photo-west .take-photo").addClass("ui-disabled");
    $("#navbar-add, #navbar-my, #navbar-all, #navbar-main-information").addClass("ui-disabled");

    // set all forms to initial values
    $("#radio-choice-1, #radio-choice-2, #radio-choice-3, #radio-choice-4, #radio-choice-5, #radio-choice-6, #radio-choice-7, #radio-choice-8, #radio-choice-9, #radio-choice-10").prop("checked",false).checkboxradio("refresh");
    $("#classes-select").text(i18n.t("menu.selectClassification"));
    $("#comment-input").val("");
    $("#slider").val(3).slider("refresh");

    isApplication = document.URL.indexOf("http://") === -1 && document.URL.indexOf("https://") === -1;

    function compassSuccess(heading) {
      compassSupported = true;
      if (isApplication) {
        $("#input-file").remove();
        $(".choose-photo").remove();
      }
      else
        $(".take-photo").remove();
    };
    function compassErrorInitial(error) {
      $(".take-photo").remove();
    };
    watchCompassID = navigator.compass.watchHeading(compassSuccess, compassErrorInitial);

    // set all initial values
    classification = "";
    photoNorth = "";
    photoEast = "";
    photoSouth = "";
    photoWest = "";
    certainty = "60%";
    comment= "";
  });

  $("#navbar-my").click(function() {
    $("#main-information, #add-menu, #allmap-stat, #legend, #guidelines").hide();
    $("#map, #legend-button").show();
    $("body").css("overflow-y", "hidden");

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
      if (err) {
        navigator.notification.alert(i18n.t("messages.errorPrivateMode"), null, "Land Cover Collector", i18n.t("messages.ok"));
        return;
      }
      else {
        var ids=[];
        var timestamps=[];
        var locations=[];
        var classes=[];
        var certainties=[];
        var comments=[];
        var count=0;
        doc.rows.forEach(function(todo) {
          if (todo.doc.location!=null && todo.doc.classification!=null) {
            ids.push(todo.doc._id);
            timestamps.push(todo.doc.timestamp);
            locations.push(todo.doc.location);
            classes.push(todo.doc.classification);
            certainties.push(todo.doc.certainty);
            comments.push(todo.doc.comment);
            count++;
          }
        });

        markersMy = vizPOIs(map, ids, timestamps, locations, classes, certainties, comments);
        if (count == 0)
          $("#mymap-stat").html(i18n.t("stat.noContrMy") +"<br><br>");
        else if (count == 1)
          $("#mymap-stat").html(i18n.t("stat.totalMy") + " " + count + " " + i18n.t("stat.contrMySingle") + "<br><br>");
        else
          $("#mymap-stat").html(i18n.t("stat.totalMy") + " " + count + " " + i18n.t("stat.contrMyPlural") + "<br><br>");

        $("#mymap-stat").show();
      }
    });
  });

  $("#navbar-all").click(function() {
    $("#main-information, #add-menu, #mymap-stat, #legend, #guidelines").hide();
    $("#map, #legend-button").show();
    $("body").css("overflow-y", "hidden");

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
      navigator.notification.alert(i18n.t("messages.allNoInternet"), null, "Land Cover Collector", i18n.t("messages.ok"));
      return;
    }
    else {
      // read data from the server database
      remotePointsDB.allDocs({include_docs: true}, function(err, doc) {
        if (err) {
          navigator.notification.alert(i18n.t("messages.error"), null, "Land Cover Collector", i18n.t("messages.ok"));
          return;
        }
        else {
          var ids=[];
          var timestamps=[];
          var locations=[];
          var classes=[];
          var certainties=[];
          var comments=[];
          var count=0;
          doc.rows.forEach(function(todo) {
            if (todo.doc.location!=null && todo.doc.classification!=null) {
              ids.push(todo.doc._id);
              locations.push(todo.doc.location);
              timestamps.push(todo.doc.timestamp);
              classes.push(todo.doc.classification);
              certainties.push(todo.doc.certainty);
              comments.push(todo.doc.comment);
              count++;
            }
          });

          markersAll = vizPOIs(map, ids, timestamps, locations, classes, certainties, comments);

          var count = 0;
          var dist;
          var curLatLngL = L.latLng(curLatLng[0], curLatLng[1]);
          for (var i = 0; i < ids.length; i++) {
            dist = curLatLngL.distanceTo(L.latLng(locations[i][0], locations[i][1]));
            if (dist <= 5000) {
              count++;
            }
          }
          if (count == 0)
            $("#allmap-stat").html(i18n.t("stat.noContrAll") +"<br/><br/>");
          else if (count == 1)
            $("#allmap-stat").html(i18n.t("stat.totalAllSingle") + " " + count + " " + i18n.t("stat.contrAllSingle") + "<br><br>");
          else
            $("#allmap-stat").html(i18n.t("stat.totalAllPlural") + " " + count + " " + i18n.t("stat.contrAllPlural") + "<br><br>");

          $("#allmap-stat").show();
        }
      });
    }
  });

  $("#navbar-main-information").click(function() {
    $("#add-menu, #mymap-stat, #allmap-stat, #map").hide();
    addInstructions("main", i18n.t("information.instructions.registration"), [1, 2, 3], "application");
    addInstructions("main", i18n.t("information.instructions.registration"), [1, 2, 3], "browser");
    addInstructions("main", i18n.t("information.instructions.location"), [4, 5], "application");
    addInstructions("main", i18n.t("information.instructions.location"), [4, 5], "browser");
    addInstructions("main", i18n.t("information.instructions.guidelines"), [6], "application");
    addInstructions("main", i18n.t("information.instructions.guidelines"), [6], "browser");
    addInstructions("main", i18n.t("information.instructions.classification"), [7, 8], "application");
    addInstructions("main", i18n.t("information.instructions.classification"), [7, 8], "browser");
    addInstructions("main", i18n.t("information.instructions.certaintyAndComment"), [9, 10], "application");
    addInstructions("main", i18n.t("information.instructions.certaintyAndComment"), [9, 10], "browser");
    addInstructions("main", i18n.t("information.instructions.takePhotoNorth"), [11, 12], "application");
    addInstructions("main", i18n.t("information.instructions.choosePhotoNorth"), [11, 12], "browser");
    addInstructions("main", i18n.t("information.instructions.takePhotoEastSouthWest"), [13, 14, 15], "application");
    addInstructions("main", i18n.t("information.instructions.choosePhotoEastSouthWest"), [13, 14, 15], "browser");
    addInstructions("main", i18n.t("information.instructions.submission"), [16, 17], "application");
    addInstructions("main", i18n.t("information.instructions.submission"), [16, 17], "browser");
    addInstructions("main", i18n.t("information.instructions.myMap"), [18, 19], "application");
    addInstructions("main", i18n.t("information.instructions.myMap"), [18, 19], "browser");
    addInstructions("main", i18n.t("information.instructions.everyone"), [20, 21], "application");
    addInstructions("main", i18n.t("information.instructions.everyone"), [20, 21], "browser");
    $("#main-information").show();
    $("body").css("overflow-y", "visible");
  });

  $("#class-cancel").click(function() {
    $("#add-menu").show();
    $("#classes-menu").hide();
    $("#navbar-add, #navbar-my, #navbar-all, #navbar-main-information").removeClass("ui-disabled");
    marker.setIcon(setMarkerClassIcon());
    marker.dragging.disable();
    navigator.compass.clearWatch(watchCompassID);
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

  function compassError(error) {
    console.log("compass error: " + error.code);
  };

  $("#comment-next").click(function() {
    comment =  $("#comment-input").val();
    $("#comment").hide();
    $("#photo-north").show();

    function compassSuccess(heading) {
      if (heading.magneticHeading >= 330 || heading.magneticHeading <= 30)
        $("#photo-north .take-photo").removeClass("ui-disabled");
      else
        $("#photo-north .take-photo").addClass("ui-disabled");
    };

    navigator.compass.clearWatch(watchCompassID);
    if (isApplication && compassSupported)
      watchCompassID = navigator.compass.watchHeading(compassSuccess, compassError);
  });

  $("#photo-north-back").click(function() {
    $("#photo-north").hide();
    $("#comment").show();
  });

  $("#photo-north-next").click(function() {
    $("#photo-north").hide();
    $("#photo-east").show();

    function compassSuccess(heading) {
      if (heading.magneticHeading >= 60 && heading.magneticHeading <= 120)
        $("#photo-east .take-photo").removeClass("ui-disabled");
      else
        $("#photo-east .take-photo").addClass("ui-disabled");
    };
    if (isApplication && compassSupported) {
      navigator.compass.clearWatch(watchCompassID);
      watchCompassID = navigator.compass.watchHeading(compassSuccess, compassError);
    }
  });

  $("#photo-east-back").click(function() {
    $("#photo-east").hide();
    $("#photo-north").show();

    function compassSuccess(heading) {
      if (heading.magneticHeading >= 330 || heading.magneticHeading <= 30)
        $("#photo-north .take-photo").removeClass("ui-disabled");
      else
        $("#photo-north .take-photo").addClass("ui-disabled");
    };
    if (isApplication && compassSupported) {
      navigator.compass.clearWatch(watchCompassID);
      watchCompassID = navigator.compass.watchHeading(compassSuccess, compassError);
    }
  });

  $("#photo-east-next").click(function() {
    $("#photo-east").hide();
    $("#photo-south").show();

    function compassSuccess(heading) {
      if (heading.magneticHeading >= 150 && heading.magneticHeading <= 210)
        $("#photo-south .take-photo").removeClass("ui-disabled");
      else
        $("#photo-south .take-photo").addClass("ui-disabled");
    };
    if (isApplication && compassSupported) {
      navigator.compass.clearWatch(watchCompassID);
      watchCompassID = navigator.compass.watchHeading(compassSuccess, compassError);
    }
  });

  $("#photo-south-back").click(function() {
    $("#photo-south").hide();
    $("#photo-east").show();

    function compassSuccess(heading) {
      if (heading.magneticHeading >= 60 && heading.magneticHeading <= 120)
        $("#photo-east .take-photo").removeClass("ui-disabled");
      else
        $("#photo-east .take-photo").addClass("ui-disabled");
    };
    if (isApplication && compassSupported) {
      navigator.compass.clearWatch(watchCompassID);
      watchCompassID = navigator.compass.watchHeading(compassSuccess, compassError);
    }
  });

  $("#photo-south-next").click(function() {
    $("#photo-south").hide();
    $("#photo-west").show();

    function compassSuccess(heading) {
      if (heading.magneticHeading >= 240 && heading.magneticHeading <= 300)
        $("#photo-west .take-photo").removeClass("ui-disabled");
      else
        $("#photo-west .take-photo").addClass("ui-disabled");
    };
    if (isApplication && compassSupported) {
      navigator.compass.clearWatch(watchCompassID);
      watchCompassID = navigator.compass.watchHeading(compassSuccess, compassError);
    }
  });

  $("#photo-west-back").click(function() {
    $("#photo-west").hide();
    $("#photo-south").show();

    function compassSuccess(heading) {
      if (heading.magneticHeading >= 150 && heading.magneticHeading <= 210)
        $("#photo-south .take-photo").removeClass("ui-disabled");
      else
        $("#photo-south .take-photo").addClass("ui-disabled");
    };
    if (isApplication && compassSupported) {
      navigator.compass.clearWatch(watchCompassID);
      watchCompassID = navigator.compass.watchHeading(compassSuccess, compassError);
    }
  });

  $("#photo-west-next").click(function() {
    $("#photo-west").hide();
    $("#navbar-add, #navbar-my, #navbar-all, #navbar-main-information").removeClass("ui-disabled");

    var timestamp = new Date().toISOString();
    var poi = {
      _id: timestamp,
      user: uuid,
      location: curLatLng,
      locationAccuracy: curLatLngAccuracy,
      lang: ln.language,
      timestamp: timestamp,
      classification: classification,
      certainty: certainty,
      comment: comment,
      _attachments:
      {
        "photo-north.png":
        {
          content_type: "image\/png",
          data: photoNorth
        },
        "photo-east.png":
        {
          content_type: "image\/png",
          data: photoEast
        },
        "photo-south.png":
        {
          content_type: "image\/png",
          data: photoSouth
        },
        "photo-west.png":
        {
          content_type: "image\/png",
          data: photoWest
        }
      }
    };

    function contributionSuccess() {
      $("#add-menu").show();
      marker.setIcon(setMarkerClassIcon());
      marker.dragging.disable();
    }

    localDB.put(poi, function callback(err) {
      if (!err) {
        if (networkState == Connection.NONE || navigator.onLine == false)
          navigator.notification.alert(i18n.t("messages.contributionSuccessNoInternet"), contributionSuccess, "Land Cover Collector", i18n.t("messages.ok"));
        else
          navigator.notification.alert(i18n.t("messages.contributionSuccess"), contributionSuccess, "Land Cover Collector", i18n.t("messages.ok"));
      }
      else {
        navigator.notification.alert(i18n.t("messages.errorStorage"), null, "Land Cover Collector", i18n.t("messages.ok"));

        remotePointsDB.put(poi, function callback(err) {
          if (!err)
            navigator.notification.alert(i18n.t("messages.contributionSuccess"), contributionSuccess, "Land Cover Collector", i18n.t("messages.ok"));
          else
            navigator.notification.alert(i18n.t("messages.error") + " " + err, null, "Land Cover Collector", i18n.t("messages.ok"));
        });
      }
    });

    marker.closePopup();
    marker.unbindPopup();

    if (isApplication && compassSupported)
      navigator.compass.clearWatch(watchCompassID);
  });

  $("#slider").bind("slidestop", function() {
    certainty = ($("#slider").val())*20+"%";
    $("#certainty-next").removeClass("ui-disabled");
  });

  $("input[type='radio']").click(function() {
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
  // this function is called when the input loads a photo
  function renderPhoto(file) {
    var reader = new FileReader();
    reader.onload = function(event) {
      var activeDivId = ($("#add-bottompanel").children().filter(function() {
        return $(this).css("display") === "block" && $(this).attr("id") !== "input-file";
      }).attr("id"));

      $("#"+activeDivId+"-next").removeClass("ui-disabled");

      var url = event.target.result;

      var activeDirection = activeDivId.split("-")[1];
      window["photo"+activeDirection.charAt(0).toUpperCase()+activeDirection.slice(1)] = url.substr(url.indexOf(",")+1);
    }

    // when the file is read it triggers the onload event above
    reader.readAsDataURL(file);
  }

  // triggered when OK is clicked
  $("input[type='file']").change(function() {
    renderPhoto(this.files[0]);
  });

  $(".choose-photo").click(function() {
    $("input[type='file']").click();
  });

  function getPictureSuccess(pictureData) {
    var activeDivId = ($("#add-bottompanel").children().filter(function() {
      return $(this).css("display") === "block";
    }).attr("id"));

    $("#"+activeDivId+"-next").removeClass("ui-disabled");

    var activeDirection = activeDivId.split("-")[1];
    window["photo"+activeDirection.charAt(0).toUpperCase()+activeDirection.slice(1)] = pictureData;
  }

  function getPictureFail(message) {
    console.log("failed taking photo, message: " + message);
  }

  $(".take-photo").click(function() {
    navigator.camera.getPicture(getPictureSuccess, getPictureFail, {
      quality: 20,
      destinationType: Camera.DestinationType.DATA_URL,
      sourceType: Camera.PictureSourceType.CAMERA
    });
  });
  /***
  photos - end
  ***/
}

$("#map").on("click", ".popup-right-arrow", function(event) {
  $(this).parent().css("display", "none");

  var parentClassNameSplitted = $(this).parent().attr("class").split("-");
  var direction = parentClassNameSplitted[parentClassNameSplitted.length - 1];
  if (direction == "north")
    $(this).parent().siblings(".popup-photos-east").css("display", "block");
  else if (direction == "east")
    $(this).parent().siblings(".popup-photos-south").css("display", "block");
  else if (direction == "south")
    $(this).parent().siblings(".popup-photos-west").css("display", "block");
});

$("#map").on("click", ".popup-left-arrow", function(event) {
  $(this).parent().css("display", "none");

  var parentClassNameSplitted = $(this).parent().attr("class").split("-");
  var direction = parentClassNameSplitted[parentClassNameSplitted.length - 1];
  if (direction == "west")
    $(this).parent().siblings(".popup-photos-south").css("display", "block");
  else if (direction == "south")
    $(this).parent().siblings(".popup-photos-east").css("display", "block");
  else if (direction == "east")
    $(this).parent().siblings(".popup-photos-north").css("display", "block");
});

var popupPhotos = document.createElement("div");
popupPhotos.className = "popup-photos";

var popupRightArrow = document.createElement("img");
popupRightArrow.className = "popup-right-arrow";
popupRightArrow.src = "img/rightTriangleSmall.png";

var popupLeftArrow = document.createElement("img");
popupLeftArrow.className = "popup-left-arrow";
popupLeftArrow.src = "img/leftTriangleSmall.png";

var popupTextNorth = document.createElement("span");
popupTextNorth.className = "popup-text-north";
var popupTextEast = document.createElement("span");
var popupTextSouth = document.createElement("span");
var popupTextWest = document.createElement("span");

var popupPhotosNorth = document.createElement("div");
popupPhotosNorth.className = "popup-photos-north";

var popupPhotosEast = document.createElement("div");
popupPhotosEast.className = "popup-photos-east";

var popupPhotosSouth = document.createElement("div");
popupPhotosSouth.className = "popup-photos-south";

var popupPhotosWest = document.createElement("div");
popupPhotosWest.className = "popup-photos-west";

popupPhotos.appendChild(popupPhotosNorth);
popupPhotos.appendChild(popupPhotosEast);
popupPhotos.appendChild(popupPhotosSouth);
popupPhotos.appendChild(popupPhotosWest);

function addPopupPhotos(id) {
  window["photoNorth"+id] = document.createElement("img");
  window["photoNorth"+id].src = "http://131.175.143.84/couchdb/lcc_points/" + id + "/photo-north.png";
  popupPhotosNorth.innerHTML = "";
  popupTextNorth.innerHTML = "<b>" + i18n.t("popup.northPhoto") + ":</b><br>";
  popupPhotosNorth.appendChild(popupTextNorth.cloneNode(true));
  popupPhotosNorth.appendChild(window["photoNorth"+id]);
  popupPhotosNorth.appendChild(popupRightArrow.cloneNode(true));

  window["photoEast"+id] = document.createElement("img");
  window["photoEast"+id].src = "http://131.175.143.84/couchdb/lcc_points/" + id + "/photo-east.png";
  popupPhotosEast.innerHTML = "";
  popupTextEast.innerHTML = "<b>" + i18n.t("popup.eastPhoto") + ":</b><br>";
  popupPhotosEast.appendChild(popupTextEast.cloneNode(true));
  popupPhotosEast.appendChild(popupLeftArrow.cloneNode(true));
  popupPhotosEast.appendChild(window["photoEast"+id]);
  popupPhotosEast.appendChild(popupRightArrow.cloneNode(true));

  window["photoSouth"+id] = document.createElement("img");
  window["photoSouth"+id].src = "http://131.175.143.84/couchdb/lcc_points/" + id + "/photo-south.png";
  popupPhotosSouth.innerHTML = "";
  popupTextSouth.innerHTML = "<b>" + i18n.t("popup.southPhoto") + ":</b><br>";
  popupPhotosSouth.appendChild(popupTextSouth.cloneNode(true));
  popupPhotosSouth.appendChild(popupLeftArrow.cloneNode(true));
  popupPhotosSouth.appendChild(window["photoSouth"+id]);
  popupPhotosSouth.appendChild(popupRightArrow.cloneNode(true));

  window["photoWest"+id] = document.createElement("img");
  window["photoWest"+id].src = "http://131.175.143.84/couchdb/lcc_points/" + id + "/photo-west.png";
  popupPhotosWest.innerHTML = "";
  popupTextWest.innerHTML = "<b>" + i18n.t("popup.westPhoto") + ":</b><br>";
  popupPhotosWest.appendChild(popupTextWest.cloneNode(true));
  popupPhotosWest.appendChild(popupLeftArrow.cloneNode(true));
  popupPhotosWest.appendChild(window["photoWest"+id]);

  return popupPhotos.outerHTML;
}

function isCommentEmpty(comment) {
  if (comment == "")
    return "";
  else
    return "<b>" + i18n.t("popup.comment") + ":</b> " + comment + "<br>";
}

function onlyUnique(value, index, self) {
  return self.indexOf(value) === index;
}

// visualizing POIs using marker cluster
function vizPOIs (map, ids, timestamps, locations, classes, certainties, comments) {
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
    marker.bindPopup("<b>" + i18n.t("popup.class") + ":</b> " + i18n.t("classes."+classes[i]) + "<br><b>" + i18n.t("popup.date") + ":</b> " + new Date(timestamps[i]).toLocaleString() + "<br><b>" + i18n.t("popup.certainty") + ":</b> " + certainties[i] + "<br>" + isCommentEmpty(comments[i]) + addPopupPhotos(ids[i]));
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

$("#start-instructions-applications-button").click(function() {
  $("#start-instructions-applications").slideToggle({"duration": 200});
});

$("#start-instructions-browsers-button").click(function() {
  $("#start-instructions-browsers").slideToggle({"duration": 200});
});

$("#start-acknowledgements-button").click(function() {
  $("#start-acknowledgements").slideToggle({"duration": 200});
});

$("#main-instructions-applications-button").click(function() {
  $("#main-instructions-applications").slideToggle({"duration": 200});
});

$("#main-instructions-browsers-button").click(function() {
  $("#main-instructions-browsers").slideToggle({"duration": 200});
});

$("#main-acknowledgements-button").click(function() {
  $("#main-acknowledgements").slideToggle({"duration": 200});
});

$("#terms-and-conditions-button").click(function() {
  $("#terms-and-conditions-list").slideToggle({"duration": 200});
});

var legendHeight, guidelinesListHeight;

$("#legend-button, #legend").hover(
  function() {
    $("#legend-button").hide();
    $("#legend").show();
    legendHeight = document.getElementById("legend").scrollHeight;
    if (legendHeight+70 > $("#map").height()) {
      $("#legend").css("height", ($("#map").height()-70) + "px");
      $("#legend").css("width", ($("#legend").width()+10) + "px");
    }
    else
      $("#legend").css("height", "auto");
  }, function() {
    $("#legend-button").show();
    $("#legend").hide();
    if (legendHeight+70 > $("#map").height())
      $("#legend").css("width", ($("#legend").width()-10) + "px");
  }
);

function adjustGuidelinesList() {
  if (guidelinesListHeight+140 > $("#map").height())
    $("#guidelines-list").css("height", ($("#map").height()-140) + "px");
  else
    $("#guidelines-list").css("height", "auto");

  if (410 > $("#map").width())
    $("#guidelines-list").css("width", ($("#map").width()-90) + "px");
  else
    $("#guidelines-list").css("width", "320px");
}

$("#guidelines-button").on("vclick", function() {
  $("#guidelines-list").toggle();
  guidelinesListHeight = document.getElementById("guidelines-list").scrollHeight;

  adjustGuidelinesList();
});

function onResize() {
  $("#map").height($(window).height() - $("#map").offset().top);
  adjustGuidelinesList();
}

function initialize() {
  ln.init();
}

function onLoad() {
  document.addEventListener("deviceready", initialize, false);
}
