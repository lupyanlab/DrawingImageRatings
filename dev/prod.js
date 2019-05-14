import { runExperiment } from "./experiment.js";

const PORT = 7101;
const FULLSCREEN = true;
$(document).ready(function() {
  $(window).on("beforeunload", function() {
    return "Are you sure you want to leave?";
  });

  //////////////////////////////////////////
  // DEFINE workerId, hitId, assignmentId HERE
  //////////////////////////////////////////
  let subjCode = $.urlParam("workerId") || "unknown";
  let numCategories = $.urlParam("numCategories") || 4;
  let reset = $.urlParam("newSet") || "false";
  let workerId = "workerId";
  let assignmentId = "assignmentId";
  let hitId = "hitId";

  $("#loading").html(
    '<h2 style="text-align:center;">Loading trials... please wait.</h2> </br> <div  class="col-md-2 col-md-offset-5"><img src="img/preloader.gif"></div>'
  );

  // This calls server to run python generate trials (judements.py) script
  // Then passes the generated trials to the experiment
  $.ajax({
    url: "http://" + document.domain + ":" + PORT + "/trials",
    type: "POST",
    contentType: "application/json",
    data: JSON.stringify({ subjCode, numCategories, reset, dev: false }),
    success: function(data) {
      console.log(data);

      let images = [];
      let categories = data.trials.categories;
      let stimuli = data.trials.images;

      for (let category of categories) {
        for (let file of stimuli[category]) {
          images.push(file);
        }
      }
      $("#loading").remove();
      runExperiment(
        data.trials,
        subjCode,
        workerId,
        assignmentId,
        hitId,
        FULLSCREEN,
        PORT
      );
      jsPsych.pluginAPI.preloadImages(images, function() {});
    }
  });
});
