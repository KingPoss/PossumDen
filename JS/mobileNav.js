function myFunction() {
  var x = document.getElementById("myLinks");
  var y = document.getElementById("icon");

  if (x.style.display === "block") {
    x.style.display = "none";
  } else {
    x.style.display = "block";
  }
  document.getElementById("myTopnav").classList.toggle("responsive");
  
} 
