function addClassToSibling(button) {
  const siblingDiv = button.nextElementSibling;
  const elements = document.getElementsByClassName('single-spot-svg');
  const blocks = document.getElementsByClassName('spot-modal');
  for (let i = 0; i < elements.length; i++) {
    if(elements[i].classList.contains("rotate-spot-45")){
      elements[i].classList.toggle("rotate-spot-0");
      elements[i].classList.toggle("rotate-spot-45");
    }
    if(blocks[i].classList.contains("show-spot-modal")){
      blocks[i].classList.toggle("hide-spot-modal");
      blocks[i].classList.toggle("show-spot-modal");
    }
  }
  button.classList.toggle("rotate-spot-0");
  button.classList.toggle("rotate-spot-45");
  if (siblingDiv) {
    siblingDiv.classList.toggle("show-spot-modal");
    siblingDiv.classList.toggle("hide-spot-modal");
  }
}

function closeModal(button) {
  // const parentDiv = button.parentNode;
  // const parentSibling = parentDiv.previousElementSibling;
  const elements = document.getElementsByClassName('single-spot-svg');
  const blocks = document.getElementsByClassName('spot-modal');
  for (let i = 0; i < elements.length; i++) {
    if(elements[i].classList.contains("rotate-spot-45")){
      elements[i].classList.toggle("rotate-spot-0");
      elements[i].classList.toggle("rotate-spot-45");
    }
    if(blocks[i].classList.contains("show-spot-modal")){
      blocks[i].classList.toggle("hide-spot-modal");
      blocks[i].classList.toggle("show-spot-modal");
    }
  }
  // parentSibling.classList.toggle("rotate-spot-0");
  // parentSibling.classList.toggle("rotate-spot-45");
  // if (parentDiv) {
  //   parentDiv.classList.toggle("hide-spot-modal");
  // }
}