export interface Frame {
  id: string;
  name: string;
  imagePath: string;
  thumbnail?: string;
  description?: string;
  layout: 'vertical' | 'horizontal' | 'single' | 'grid';
  slots: number;
}

export const frames: Frame[] = [
  {
    id: 'vertical-narrow',
    name: "Narrow Vertical Strip",
    imagePath: '/frames/vertical-narrow.svg',
    description: 'Sleek narrow vertical frame with minimalist white design',
    layout: 'vertical',
    slots: 4
  },
  // {
  //   id: 'sample-image',
  //   name: 'sample gpt',
  //   imagePath: '/frames/sample-image.svg',
  //   description: 'Elegant white frame with four vertical photos and minimalist design',
  //   layout: 'vertical',
  //   slots: 4
  // },
  // {
  //   id: 'vertical-nocturne',
  //   name: "Nocturne's Vertical",
  //   imagePath: '/frames/vertical-nocturne.svg',
  //   description: 'Elegant white frame with vertical layout and signature footer',
  //   layout: 'vertical',
  //   slots: 4
  // },
  
  

  // {
  //   id: 'boxed-memories',
  //   name: 'Boxed Memories',
  //   imagePath: '/frames/boxed-memories.svg',
  //   description: 'Modern grid layout with four square photos and a stylish footer',
  //   layout: 'grid',
  //   slots: 4
  // },
  
  
  {
    id: 'quad-landscape',
    name: 'Quad Landscape',
    imagePath: '/frames/quad-landscape.svg',
    description: 'Modern landscape layout with four photos and elegant footer',
    layout: 'horizontal',
    slots: 4
  },

];