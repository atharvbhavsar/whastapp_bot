// AOS animation
AOS.init({
  offset: 120,
  delay: 0,
  duration: 2000,
  easing: "ease",
  once: false,
  mirror: false,
  anchorPlacement: "top-bottom",
});

// testimonial slider
$(".testimonial-slider").slick({
  dots: true,
  infinite: true,
  autoplay: false,
  autoplaySpeed: 1000,
  slickGoTo: 0,
  speed: 3000,
  slidesToShow: 3,
  slidesToScroll: 1,
  prevArrow: false,
  nextArrow: false,
  responsive: [
    {
      breakpoint: 1200,
      settings: {
        slidesToShow: 3,
        slidesToScroll: 1,
      },
    },
    {
      breakpoint: 992,
      settings: {
        slidesToShow: 2,
        slidesToScroll: 1,
      },
    },
    {
      breakpoint: 768,
      settings: {
        slidesToShow: 1,
        slidesToScroll: 1,
      },
    },
    {
      breakpoint: 576,
      settings: {
        slidesToShow: 1,
        slidesToScroll: 1,
      },
    },
    {
      breakpoint: 320,
      settings: {
        slidesToShow: 1,
        slidesToScroll: 1,
      },
    },
  ],
});

// Header search form home three
document.addEventListener("DOMContentLoaded", function () {
  const headerSearchButton = document.getElementById("headerSearchButton");
  const headerSearchField = document.getElementById("headerSearchField");

  if (document.body.getAttribute("data-page-id") === "specific-header-search") {
    headerSearchButton.addEventListener("click", function () {
      headerSearchField.classList.add("active-input");
    });
  }
});

// testimonial slider home three pages
$(".testimonial-slider-home-three-pages").slick({
  dots: false,
  infinite: true,
  autoplay: false,
  autoplaySpeed: 1000,
  slickGoTo: 0,
  speed: 3000,
  slidesToShow: 1,
  slidesToScroll: 1,
  prevArrow:
    "<img class='a-left control-c prev slick-prev' src='images/multiple-use/testimonial/left.gif'>",
  nextArrow:
    "<img class='a-right control-c next slick-next' src='./images/multiple-use/testimonial/right.gif'>",
  responsive: [
    {
      breakpoint: 1200,
      settings: {
        slidesToShow: 1,
        slidesToScroll: 1,
      },
    },
    {
      breakpoint: 992,
      settings: {
        slidesToShow: 1,
        slidesToScroll: 1,
      },
    },
    {
      breakpoint: 768,
      settings: {
        slidesToShow: 1,
        slidesToScroll: 1,
      },
    },
    {
      breakpoint: 576,
      settings: {
        slidesToShow: 1,
        slidesToScroll: 1,
      },
    },
    {
      breakpoint: 320,
      settings: {
        slidesToShow: 1,
        slidesToScroll: 1,
      },
    },
  ],
});

// said menu bar
function openNav() {
  document.getElementById("mySidenav").style.width = "400px";
}

function closeNav() {
  document.getElementById("mySidenav").style.width = "0";
}

// up to down button
const toTop = document.querySelector(".to-top");
window.addEventListener("scroll", () => {
  if (window > 0) {
    toTop.classList.remove("active");
  } else if (window.pageYOffset > 1500) {
    toTop.classList.add("active");
  } else {
    toTop.classList.remove("active");
  }
});

// home one First video popup

const videoPlayOneFirst = document.getElementById("video-play-btn-one-first");
const videoCloseOneFirst = document.querySelector(".video-close-btn.one-first");
const videoModalWrapperOneFirst = document.querySelector(
  ".video-modal-wrapper.one-first"
);
const webVideoOneFirst = document.querySelector(".web-video.one-first");
const removeDivOneFirst = document.querySelector(".remove-div.one-first");

function videoPlayBtnOneFirst() {
  removeDivOneFirst.removeAttribute("data-aos");
  videoModalWrapperOneFirst.style.display = "block";
  webVideoOneFirst.pause();
}

function videoCloseBtnOneFirst() {
  videoModalWrapperOneFirst.style.display = "none";
  webVideoOneFirst.pause();
  removeDivOneFirst.setAttribute("data-aos", "fade-up");
}

window.addEventListener("click", function (e) {
  if (e.target == videoModalWrapperOneFirst) {
    videoModalWrapperOneFirst.style.display = "none";
    webVideoOneFirst.pause();
    removeDivOneFirst.setAttribute("data-aos", "fade-up");
  }
});

// home one Second video popup

const videoModalWrapperOneSecond = document.querySelector(
  ".video-modal-wrapper.one-second"
);
const webVideoOneSecond = document.querySelector(".web-video.one-second");
const removeDivOneSecond = document.querySelector(".remove-div.one-second");

function videoPlayBtnOneSecond() {
  removeDivOneSecond.removeAttribute("data-aos");
  videoModalWrapperOneSecond.style.display = "block";
  webVideoOneSecond.pause();
}

function videoCloseBtnOneSecond() {
  videoModalWrapperOneSecond.style.display = "none";
  webVideoOneSecond.pause();
  removeDivOneSecond.setAttribute("data-aos", "fade-up");
}
window.addEventListener("click", function (e) {
  if (e.target == videoModalWrapperOneSecond) {
    videoModalWrapperOneSecond.style.display = "none";
    webVideoOneSecond.pause();
    removeDivOneSecond.setAttribute("data-aos", "fade-up");
  }
});

// home Three First video popup

const videoPlayThreeFirst = document.getElementById(
  "video-play-btn-three-first"
);
const videoCloseThreeFirst = document.querySelector(
  ".video-close-btn.three-first"
);
const videoModalWrapperThreeFirst = document.querySelector(
  ".video-modal-wrapper.three-first"
);
const webVideoThreeFirst = document.getElementById("web-video-three-first");
const removeDivThreeFirst = document.getElementById("remove-div-three-first");

function myFunction() {
  removeDivThreeFirst.removeAttribute("data-aos");
  videoModalWrapperThreeFirst.style.display = "block";
  webVideoThreeFirst.pause();
}

function myFunctionClose() {
  videoModalWrapperThreeFirst.style.display = "none";
  webVideoThreeFirst.pause();
  removeDivThreeFirst.setAttribute("data-aos", "fade-up");
}

window.addEventListener("click", function (e) {
  if (e.target == videoModalWrapperThreeFirst) {
    videoModalWrapperThreeFirst.style.display = "none";
    webVideoThreeFirst.pause();
    removeDivThreeFirst.setAttribute("data-aos", "fade-up");
  }
});

// home Four First video popup

const videoModalWrapperFourFirst = document.getElementById(
  "video-modal-wrapper-four-first"
);
const webVideoFourFirst = document.getElementById("web-video-four-first");
const removeDivFourFirst = document.getElementById("remove-div-four-first");

function videoPlayFourFirst() {
  removeDivFourFirst.removeAttribute("data-aos");
  videoModalWrapperFourFirst.style.display = "block";
  webVideoFourFirst.pause();
}

function videoCloseFourFirst() {
  videoModalWrapperFourFirst.style.display = "none";
  webVideoFourFirst.pause();
  removeDivFourFirst.setAttribute("data-aos", "fade-up");
}

window.addEventListener("click", function (e) {
  if (e.target == videoModalWrapperFourFirst) {
    videoModalWrapperFourFirst.style.display = "none";
    webVideoFourFirst.pause();
    removeDivFourFirst.setAttribute("data-aos", "fade-up");
  }
});

// home Four Second video popup

const videoModalWrapperFourSecond = document.getElementById(
  "video-modal-wrapper-four-second"
);
const webVideoFourSecond = document.getElementById("web-video-four-second");
const removeDivFourSecond = document.getElementById("remove-div-four-second");

function videoPlayBtnFourSecond() {
  removeDivFourSecond.removeAttribute("data-aos");
  videoModalWrapperFourSecond.style.display = "block";
  webVideoFourSecond.pause();
}

function videoCloseBtnFourSecond() {
  videoModalWrapperFourSecond.style.display = "none";
  webVideoFourSecond.pause();
  removeDivFourSecond.setAttribute("data-aos", "fade-up");
}
window.addEventListener("click", function (e) {
  if (e.target == videoModalWrapperFourSecond) {
    videoModalWrapperFourSecond.style.display = "none";
    webVideoFourSecond.pause();
    removeDivFourSecond.setAttribute("data-aos", "fade-up");
  }
});

// progress bars
let progressNum = document.getElementById("progressNumber");

if (progressNum) {
  let counter = 0;
  let intervalId = setInterval(progressBar, 52);

  function progressBar() {
    if (counter == 79) {
      clearInterval(intervalId);
    } else {
      counter++;
      progressNum.innerText = counter + "%";
    }
  }
} else {
}

// progress bars (Rate, Work, Client)
let progressNumberRate = document.getElementById("progressNumberRate");
if (progressNumberRate) {
  let counter = 0;
  let intervalId = setInterval(progressBarOne, 52);

  function progressBarOne() {
    if (counter == 80) {
      clearInterval(intervalId);
    } else {
      counter++;
      progressNumberRate.innerText = counter + "%";
    }
  }
} else {
}

let progressNumberWork = document.getElementById("progressNumberWork");
if (progressNumberWork) {
  let counter = 0;
  let intervalId = setInterval(progressBarTwo, 52);

  function progressBarTwo() {
    if (counter == 50) {
      clearInterval(intervalId);
    } else {
      counter++;
      progressNumberWork.innerText = counter + "%";
    }
  }
} else {
}

let progressNumberClient = document.getElementById("progressNumberClient");
if (progressNumberClient) {
  let counter = 0;
  let intervalId = setInterval(progressBarThree, 52);

  function progressBarThree() {
    if (counter == 95) {
      clearInterval(intervalId);
    } else {
      counter++;
      progressNumberClient.innerText = counter + "%";
    }
  }
} else {
}

// ========Our Dedicated Investigators============
var shareButtons = document.querySelectorAll(".share-button");
var socialLinksList = document.querySelectorAll(".social-links");

shareButtons.forEach(function (shareButton, index) {
  shareButton.addEventListener("click", function () {
    socialLinksList[index].classList.toggle("hideLink");
  });
});

// Google Maps Api
function initMap() {
  let mapOptions = {
    center: { lat: 51.50852519215726, lng: -0.13461554383087837 },
    zoom: 12,
  };
  let map = new google.maps.Map(document.getElementById("map"), mapOptions);

  // infoWindow
  let marker = new google.maps.Marker({
    position: { lat: 51.50852519215726, lng: -0.13461554383087837 },
    map: map,
  });
  const infoWindowOptions = {
    position: { lat: 51.50852519215726, lng: -0.13461554383087837 },
    pixelOffset: new google.maps.Size(-40, 10),
  };
  const infoWindow = new google.maps.InfoWindow(infoWindowOptions);
  infoWindow.setContent(`<div class="map-part">
    <h4 style="color: white;">London Office</h4>
    <hr style="color: white;">
    <p style="line-height: 20px; color: white; margin-bottom: 20px">Located in the heart of one of the world's most dynamic cities, our London office serves as a hub for innovation and collaboration.</p>

    <a style="color: white;" href="tel:+1999806915"> <i class="bi bi-telephone phone"></i> +199(980) 6915</a> <br><br>
    <a style="color: white;" href="mailto:shifamoni@gmail.com"> <i class="bi bi-envelope email"></i> shifamoni@gmail.com</a> <br><br><br>

    <div class="mayor-footer d-flex align-items-center align-content-center justify-content-between cityWall-btn-two"> <a href="#" style="background: #0f1026;">Visit More<i class="bi bi-arrow-right"></i></a></div>
    </div>`);

  const infoWindowOpenOptions = {
    map: map,
    anchor: marker,
    shouldFocus: false,
  };

  infoWindow.open(infoWindowOpenOptions);
}

// counting numbers

document.addEventListener("DOMContentLoaded", function () {
  function startCounter(elementId, endCount, interval) {
    const element = document.getElementById(elementId);
    if (element) {
      let count = 0;
      let intervalId = setInterval(() => {
        count++;
        element.textContent = count;
        if (count === endCount) {
          clearInterval(intervalId);
        }
      }, interval);
    }
  }

  startCounter("counting-one", 11, 100);
  startCounter("counting-two", 20, 100);
  startCounter("counting-three", 40, 100);
});

// Blog Pagination

let paginationLinks = document.querySelectorAll(".link");
let blogCards = document.querySelectorAll(".blog-card");
let currentValueBlog = 1;

function activeLink(event) {
  if (event && event.currentTarget) {
    paginationLinks.forEach((link) => link.classList.remove("active-link"));
    event.currentTarget.classList.add("active-link");
    currentValueBlog = parseInt(event.currentTarget.getAttribute("value"));
    blogCards.forEach((card) => card.classList.remove("blog-active"));
    blogCards[currentValueBlog - 1].classList.add("blog-active");
  }
}

function backBtn() {
  if (currentValueBlog > 1) {
    currentValueBlog--;
    updatePagination();
  }
}

function nextBtn() {
  if (currentValueBlog < paginationLinks.length) {
    currentValueBlog++;
    updatePagination();
  }
}
function updatePagination() {
  paginationLinks.forEach((link) => link.classList.remove("active-link"));
  paginationLinks[currentValueBlog - 1].classList.add("active-link");
  blogCards.forEach((card) => card.classList.remove("blog-active"));
  blogCards[currentValueBlog - 1].classList.add("blog-active");
}

// Add event listeners to the pagination links
paginationLinks.forEach((link) => link.addEventListener("click", activeLink));

// form box
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("commentForm");
  const formMessages = document.getElementById("formMessages");

  // Check if the form and formMessages elements exist
  if (form && formMessages) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();

      // Validate the form fields
      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const comment = document.getElementById("comment").value.trim();

      if (!name || !email || !comment) {
        formMessages.textContent = "All fields are required.";
        formMessages.style.color = "red";
        return;
      }

      // Display success message
      formMessages.textContent = "Thank you for your comment!";
      formMessages.style.color = "green";

      // Clear the form fields
      form.reset();
    });
  } else {
    console.warn("Comment form or form messages element not found.");
  }
});

// =====Contact Section=====
document.addEventListener("DOMContentLoaded", function () {
  const contactForm = document.getElementById("contactForm");

  if (contactForm) {
    contactForm.addEventListener("submit", function (event) {
      event.preventDefault();

      let name = document.getElementById("name").value;
      let email = document.getElementById("email").value;
      let phone = document.getElementById("phone").value;
      let subject = document.getElementById("subject").value;
      let company = document.getElementById("company").value;
      let message = document.getElementById("message").value;

      // Simple form validation
      if (name && email && phone && subject && company && message) {
        alert("Thank you for your message. We will get back to you shortly.");
      } else {
        alert("Please fill in all fields.");
      }
    });
  }
});


var $affectedElements = $("p, h1, h2, h3, h4, h5, h6, span, div, i, a"); // Can be extended, ex. $("div, p, span.someClass")

// Storing the original size in a data attribute so size can be reset

let incCount = 0;
let decCount = 0;
const maxLimit = 4;

// Save original size once
$(document).ready(function () {
    $affectedElements.each(function () {
        var $this = $(this);
        $this.data("orig-size", $this.css("font-size"));
    });
});

$("#btn-increase").click(function () {
    if (incCount < maxLimit) {
        changeFontSize(1);
        incCount++;
    }
});

$("#btn-decrease").click(function () {
    if (decCount < maxLimit) {
        changeFontSize(-1);
        decCount++;
    }
});

$("#btn-orig").click(function () {
    $affectedElements.each(function () {
        var $this = $(this);
        $this.css("font-size", $this.data("orig-size")); // Now it works
    });

    incCount = 0;
    decCount = 0;
});

function changeFontSize(direction) {
    $affectedElements.each(function () {
        var $this = $(this);
        $this.css("font-size", parseInt($this.css("font-size")) + direction);
    });
}
