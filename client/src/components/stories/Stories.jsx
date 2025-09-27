import React from "react";

import '/src/components/stories/Stories.css'

import firstStory from '/src/assets/recomendation/image.png'
import secondStory from '/src/assets/recomendation/image-2.png'
import thirdStory from '/src/assets/recomendation/image-3.png'
import fourStory from '/src/assets/recomendation/image-4.png'
import fiveStory from '/src/assets/recomendation/image-5.png'
import sixStory from '/src/assets/recomendation/image-6.png'

const Stories = () => {
  const cards = [
    {
      title: "Если проездом",
      image: firstStory,
    },
    {
      title: "За 1 день",
      image: secondStory,
    },
    {
      title: "За 3 дня",
      image: thirdStory,
    },
    {
      title: "За 7 дней",
      image: fourStory,
    },
    {
      title: "Летом",
      image: fiveStory,
    },
    {
      title: "Зимой",
      image: sixStory,
    },
  ];

 return (
  <div className="carousel">
    <div className="carousel-track">
      {cards.map((card, index) => (
        <div
          className="carousel-item"
          key={index}
          style={{ backgroundImage: `url(${card.image})` }}
        >
          <div className="carousel-label">{card.title}</div>
        </div>
      ))}
      <div className="carousel-spacer"></div>
    </div>
  </div>
);

};

export default Stories;
