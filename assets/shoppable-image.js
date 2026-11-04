// document.addEventListener("DOMContentLoaded", function () {
  
//   const hotSpots = document.querySelectorAll(".single-spot-svg");
  
//   hotSpots.forEach((spot) => {
//     spot.addEventListener("click", function (el) {
      
//       console.log('clicked the hotspot');
//       const spot = el.target
//       console.log(el);
//       const modalId = spot.getAttribute("data-target");
//       console.log(modalId);
//       const modals = document.querySelectorAll(".spot-modal");

//       modals.forEach((modal) => {
//         modal.classList.remove('show-spot-modal')
//         modal.classList.add('hide-spot-modal')
//       });

//       const svgs = document.querySelectorAll(".single-spot-svg");

//       svgs.forEach((svg) => {
//         svg.classList.add("rotate-spot-0");
//         svg.classList.remove("rotate-spot-45");
//       });

//       const spotModal = document.getElementById(modalId);
      
//       if (spotModal) {
//           console.log('found the modal')
//         if (spotModal.classList.contains('hide-spot-modal')) { 
//           spotModal.classList.remove('hide-spot-modal')
//           spotModal.classList.add('show-spot-modal')
//           spot.classList.remove("rotate-spot-0");
//           spot.classList.add("rotate-spot-45");
//         }
        

//       }
//     });
//   });
// });

function addClassToSibling(button) {
  const siblingDiv = button.nextElementSibling;
  button.classList.toggle("rotate-spot-0");
  button.classList.toggle("rotate-spot-45");
  if (siblingDiv) {
    siblingDiv.classList.toggle("show-spot-modal");
    siblingDiv.classList.toggle("hide-spot-modal");
  }
}

function closeModal(button) {
  const parentDiv = button.parentNode;
  const parentSibling = parentDiv.previousElementSibling;
  parentSibling.classList.toggle("rotate-spot-0");
  parentSibling.classList.toggle("rotate-spot-45");
  if (parentDiv) {
    parentDiv.classList.toggle("hide-spot-modal");
  }
}