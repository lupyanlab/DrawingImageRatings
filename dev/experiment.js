import demographicsQuestions from "./demographics.js";

function qNQuestionComparator(a, b) {
  const n1 = Number(a[0].slice(1));
  const n2 = Number(b[0].slice(1));
  return n1 - n2;
}

// Function Call to Run the experiment
export function runExperiment(
  trials,
  subjCode,
  workerId,
  assignmentId,
  hitId,
  FULLSCREEN,
  PORT
) {
  let timeline = [];

  // Data that is collected for jsPsych
  let turkInfo = jsPsych.turk.turkInfo();
  let participantID = makeid() + "iTi" + makeid();

  jsPsych.data.addProperties({
    subject: participantID,
    condition: "explicit",
    group: "shuffled",
    workerId: workerId,
    assginementId: assignmentId,
    hitId: hitId
  });

  // sample function that might be used to check if a subject has given
  // consent to participate.
  var check_consent = function(elem) {
    if ($("#consent_checkbox").is(":checked")) {
      return true;
    } else {
      alert(
        "If you wish to participate, you must check the box next to the statement 'I agree to participate in this study.'"
      );
      return false;
    }
    return false;
  };

  // declare the block.
  var consent = {
    type: "external-html",
    url: "./consent.html",
    cont_btn: "start",
    check_fn: check_consent
  };

  timeline.push(consent);

  let continue_space =
    "<div class='right small'>(press SPACE to continue)</div>";

  let instructions = {
    type: "instructions",
    key_forward: "space",
    key_backward: "backspace",
    pages: [
      /*html*/ `<p class="lead">In this HIT, you will see various images of familiar objects. For each image, please rate how typical it is of its category.
            For example, you may be shown a series of motorcycles and asked how typical each one is of motorcyles in general.
            </p> <p class="lead">Use the  1-5 keys on the keyboard to respond. 1 means very typical. 5 means very atypical. Please try to use the entire scale, not just the 1/5 keys. If you rush through without attending to the images, we may deny payment.
            </p> ${continue_space}`
    ]
  };

  timeline.push(instructions);
  let num_trials = trials.categories.reduce(
    (a, category) => a + trials.images[category].length,
    0
  );
  document.trials = trials;

  let trial_number = 1;
  let progress_number = 1;

  const { categoryNamesMap } = trials;
  // Pushes each audio trial to timeline
  trials.categories.forEach(category => {
    trials.images[category].forEach(image => {
      let response = {
        subjCode: subjCode,
        participantID: participantID,
        category: category,
        image: image,
        expTimer: -1,
        response: -1,
        trial_number: trial_number,
        rt: -1
      };

      const questions = [
        {
          key: "how well drawn",
          prompt: `How well drawn is this ${categoryNamesMap[category]}?`,
          labels: [
            "1 (Very badly drawn)",
            "2",
            "3",
            "4",
            "5 (Very well drawn)"
          ],
          required: true
        },
        {
          key: "how typical",
          prompt: `How typical is this ${categoryNamesMap[category]} of ${
            categoryNamesMap[category]
          }s in general?`,
          labels: ["1 (Very typical)", "2", "3", "4", "5 (Very atypical)"],
          required: true
        }
      ];

      const drawingQuestionsTrial = {
        type: "survey-likert",
        preamble: /*html*/ `        
          <h4 style="text-align:center;margin-top:0;width:50vw;">Trial ${trial_number} of ${num_trials}</h4>
          <div style="width:100%;">
              <div style="width: 100%;;text-align:center;margin: auto;padding: 0em;">
                  <img src="${"http://" +
                    document.domain +
                    ":" +
                    PORT +
                    "/" +
                    image}" alt="${image}" height="200px" align="middle" style="max-width:400px;width=50%;" />
              </div>
          </div>
        `,
        questions,
        button_label: "Submit",

        on_finish: function(data) {
          const responses = Object.entries(JSON.parse(data.responses))
            .sort(qNQuestionComparator)
            .reduce(
              (acc, [QN, response], i) => ({
                ...acc,
                [questions[i].key]: response + 1 // choices start with 1 instead of 0
              }),
              {
                subjCode,
                category,
                image: image,
                rt: data.rt,
                expTimer: data.time_elapsed / 1000
              }
            );
          console.log(responses);

          // POST response data to server
          $.ajax({
            url: "http://" + document.domain + ":" + PORT + "/data",
            type: "POST",
            contentType: "application/json",
            data: JSON.stringify(responses),
            success: function() {
              console.log(responses);
            }
          });
          jsPsych.setProgressBar(progress_number / num_trials);
          progress_number++;
        }
      };

      timeline.push(drawingQuestionsTrial);
      trial_number++;
    });
  });

  let questionsInstructions = {
    type: "instructions",
    key_forward: "space",
    key_backward: "backspace",
    pages: [
      `<p class="lead">Thank you! We'll now ask a few demographic questions and you'll be done!
            </p> ${continue_space}`
    ]
  };
  timeline.push(questionsInstructions);

  window.questions = trials.questions; // allow surveyjs to access questions

  let demographicsTrial = {
    type: "surveyjs",
    questions: demographicsQuestions,
    on_finish: function(data) {
      let demographicsResponses = data.response;
      let demographics = Object.assign({ subjCode }, demographicsResponses);
      console.log(demographics);
      // POST demographics data to server
      $.ajax({
        url: "http://" + document.domain + ":" + PORT + "/demographics",
        type: "POST",
        contentType: "application/json",
        data: JSON.stringify(demographics),
        success: function() {}
      });

      let endmessage = `Thank you for participating! Your completion code is ${participantID}. Copy and paste this in 
        MTurk to get paid. 
        <p>The purpose of this HIT is to assess the extent to which different people agree what makes
        a particular dog, cat, or car typical.
        
        <p>
        If you have any questions or comments, please email cschonberg@wisc.edu.`;
      jsPsych.endExperiment(endmessage);
    }
  };
  timeline.push(demographicsTrial);

  let images = [];
  // add scale pic paths to images that need to be loaded
  images.push("img/scale.png");
  for (let i = 1; i <= 7; i++) images.push("img/scale" + i + ".jpg");

  jsPsych.pluginAPI.preloadImages(images, function() {
    startExperiment();
  });
  document.timeline = timeline;
  function startExperiment() {
    jsPsych.init({
      default_iti: 0,
      timeline: timeline,
      fullscreen: FULLSCREEN,
      show_progress_bar: true,
      auto_update_progress_bar: false
    });
  }
}
