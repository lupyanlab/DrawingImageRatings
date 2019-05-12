Survey.Survey.cssType = "bootstrap";
Survey.defaultBootstrapCss.navigationButton = "btn btn-green";

window.survey = new Survey.Model({questions: [
{ type: "matrix", name: "answers", isRequired: true, title: "Please indicate if you agree or disagree with the following statements",
   columns: [{ value: "Strongly Disagree", text: "Strongly Disagree" }, 
              { value: "Disagree" , text: "Disagree" }, 
              { value: "Neutral", text: "Neutral" }, 
              { value: "Agree", text: "Agree" }, 
              { value: "Strongly Agree", text: "Strongly Agree" }],
    rows: window.questions.map((q) => { return { value: q, text: q }})
}
]});

let IRQCompleted = false;
function IRQIsCompleted() {
    return IRQCompleted;
}
let IRQResponses = {};
function getIRQResponses() {
    return IRQResponses;
}

survey.onComplete.add(function(result) {
    IRQCompleted = true;
    IRQResponses = result.data;
    // document.querySelector('#surveyResult').innerHTML = "result: " + JSON.stringify(result.data);
});

$("#surveyElement").Survey({ 
    model: survey,
    onValidateQuestion: surveyValidateQuestion
});

function surveyValidateQuestion(s, options) {
    if (options.name === 'Quality') {
        var question = s.getQuestionByName("Quality");
        if(!question.rows.every(function(row) { return (options.value || {})[row.itemValue] !== undefined; })) {
            options.error = "Please fill out every question.";
        }
    }
}

$(document).ready(function(){
    survey.showCompletedPage = false;
    $('#surveyElement').find('.sv_complete_btn').attr('id', 'IRQ-cmplt');
});
