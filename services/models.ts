export type PoseCategory = 'action' | 'angle' | 'variation';

export interface Pose {
  id: string; // e.g., 'A1'
  name: string;
  imageUrl: string;
  category: PoseCategory;
  command: string;
}

export interface Model {
  id: string;
  gender: 'Male' | 'Female';
  label: string; // Ethnic Label
  fullBodyUrl: string;
  closeUpUrl: string;
  poses?: Pose[];
}

const MALE_MODELS: Model[] = [
    {
        id: 'M_A',
        gender: 'Male',
        label: 'Model 1',
        fullBodyUrl: 'https://i.postimg.cc/qqHYrcsx/A-main.jpg',
        closeUpUrl: 'https://i.postimg.cc/52rs1q1N/A-main-closeup.jpg',
        poses: [
            { id: 'A1', name: 'Pose 1', imageUrl: 'https://i.postimg.cc/j26V6ZPM/A1.jpg', category: 'action', command: 'Full body, slight forward lean, hands clasped, selling the fit.' },
            { id: 'A2', name: 'Pose 2', imageUrl: 'https://i.postimg.cc/cJvVkswj/A2.jpg', category: 'angle', command: '3/4 view, adjusting jacket, showing side construction.' },
            { id: 'A3', name: 'Pose 3', imageUrl: 'https://i.postimg.cc/9Fx866mX/A3.jpg', category: 'action', command: 'Full body, casual lean with hands in pockets, relaxed attitude.' },
            { id: 'A4', name: 'Pose 4', imageUrl: 'https://i.postimg.cc/J4hK5pbY/A4.jpg', category: 'action', command: 'Full body, dynamic walking motion, creating natural fabric movement.' },
            { id: 'A5', name: 'Pose 5', imageUrl: 'https://i.postimg.cc/k4cFxSDS/A5.jpg', category: 'action', command: 'Full body, leaning casually on a stool or prop.' },
            { id: 'A6', name: 'Pose 6', imageUrl: 'https://i.postimg.cc/PrcbzTf8/A6.jpg', category: 'variation', command: 'Model sitting casually on a stool, cross-legged, showing garment drape.' },
            { id: 'A7', name: 'Pose 7', imageUrl: 'https://i.postimg.cc/Dz3qH6Xr/A7.jpg', category: 'angle', command: '3/4 view from the back, looking over the shoulder, showing shoulder fit.' },
            { id: 'A8', name: 'Pose 8', imageUrl: 'https://i.postimg.cc/XqP58kW3/A8.jpg', category: 'angle', command: 'Close-up 3/4 back view, focusing on collar and shoulder details.' },
            { id: 'A9', name: 'Pose 9', imageUrl: 'https://i.postimg.cc/wTtLBZ5N/A9.jpg', category: 'angle', command: '3/4 back view with hands in pockets, looking over the shoulder.' },
            { id: 'A10', name: 'Pose 10', imageUrl: 'https://i.postimg.cc/7L42mLFG/A10.jpg', category: 'action', command: 'Full body, relaxed front-facing stance with one hand in pocket.' },
            { id: 'A11', name: 'Pose 11', imageUrl: 'https://i.postimg.cc/qRb6Jxzm/A11.jpg', category: 'action', command: 'Model resting against a prop with hand in pocket.' },
            { id: 'A12', name: 'Pose 12', imageUrl: 'https://i.postimg.cc/02JKvmxd/A12.jpg', category: 'angle', command: 'Direct rear view, looking back over the shoulder.' },
            { id: 'A14', name: 'Pose 13', imageUrl: 'https://i.postimg.cc/KvXBRQ0L/A14.jpg', category: 'angle', command: 'Side profile, leaning on prop, head turned towards camera.' },
            { id: 'A15', name: 'Pose 14', imageUrl: 'https://i.postimg.cc/yNrSBTJr/A15.jpg', category: 'angle', command: 'Direct rear view, highlighting the back details of the garment.' },
            { id: 'A16', name: 'Pose 15', imageUrl: 'https://i.postimg.cc/mgLcHnCz/A16.jpg', category: 'action', command: '3/4 forward view, relaxed stance with one hand in pocket.' },
        ]
    },
    {
        id: 'M_B',
        gender: 'Male',
        label: 'Model 2',
        fullBodyUrl: 'https://i.postimg.cc/63q6RXgM/B-main.jpg',
        closeUpUrl: 'https://i.postimg.cc/P5dCxBXK/B-main-closeup.jpg',
        poses: [
            { id: 'B1', name: 'Pose 1', imageUrl: 'https://i.postimg.cc/hGJt8RjV/B1.jpg', category: 'action', command: 'Symmetrical front-facing stance, hands clasped, conveying confidence.' },
            { id: 'B2', name: 'Pose 2', imageUrl: 'https://i.postimg.cc/3NhrHyZy/B2.jpg', category: 'angle', command: 'Full side profile, model adjusting chest of garment with a downward gaze.' },
            { id: 'B3', name: 'Pose 3', imageUrl: 'https://i.postimg.cc/3rjJFBKb/B3.jpg', category: 'variation', command: 'Model seated, leaning forward with hands clasped, creating a thoughtful mood.' },
            { id: 'B4', name: 'Pose 4', imageUrl: 'https://i.postimg.cc/mgnbgpSq/B4.jpg', category: 'action', command: 'Side profile, leaning against a wall with hand in pocket, head turned to camera.' },
            { id: 'B5', name: 'Pose 5', imageUrl: 'https://i.postimg.cc/8CrTJdKn/B5.jpg', category: 'action', command: 'Casual side profile, leaning against a wall with hand in pocket.' },
            { id: 'B6', name: 'Pose 6', imageUrl: 'https://i.postimg.cc/HnTmhqpz/B6.jpg', category: 'action', command: 'Full body, dynamic walking motion with one hand in pocket.' },
            { id: 'B7', name: 'Pose 7', imageUrl: 'https://i.postimg.cc/jqht7Scb/B7.jpg', category: 'action', command: 'Model leaning against a stool, conveying a relaxed attitude.' },
            { id: 'B8', name: 'Pose 8', imageUrl: 'https://i.postimg.cc/2S1DMFDj/B8.jpg', category: 'variation', command: 'Model seated on a stool with an open, confident body position.' },
            { id: 'B9', name: 'Pose 9', imageUrl: 'https://i.postimg.cc/nL7tcFrg/B9.jpg', category: 'angle', command: '3/4 back view with hands in pockets, looking over the shoulder.' },
            { id: 'B10', name: 'Pose 10', imageUrl: 'https://i.postimg.cc/7hPvVSVS/B10.jpg', category: 'angle', command: 'Direct rear view, looking back over the shoulder.' },
            { id: 'B11', name: 'Pose 11', imageUrl: 'https://i.postimg.cc/J0pfdtYG/B11.jpg', category: 'action', command: 'Confident 3/4 forward stance, highlighting the garment shape.' },
            { id: 'B12', name: 'Pose 12', imageUrl: 'https://i.postimg.cc/sgktLkmv/B12.jpg', category: 'angle', command: 'Direct rear view, highlighting the back details of the garment.' },
            { id: 'B13', name: 'Pose 13', imageUrl: 'https://i.postimg.cc/tJ4fPpqk/B13.jpg', category: 'angle', command: 'Stylized side profile shot with one hand in pocket.' },
            { id: 'B14', name: 'Pose 14', imageUrl: 'https://i.postimg.cc/brV59Wd0/B14.jpg', category: 'action', command: 'Full body, leaning on a prop with hand in pocket.' },
        ]
    },
    {
        id: 'M_C',
        gender: 'Male',
        label: 'Model 3',
        fullBodyUrl: 'https://i.postimg.cc/C5VF2qzp/C-main.jpg',
        closeUpUrl: 'https://i.postimg.cc/hjcy34c1/C-main-closeup.jpg',
        poses: [
            { id: 'C1', name: 'Pose 1', imageUrl: 'https://i.postimg.cc/pT21bRFQ/C1.jpg', category: 'action', command: 'Full body, relaxed front-facing stance with one hand in pocket.' },
            { id: 'C2', name: 'Pose 2', imageUrl: 'https://i.postimg.cc/3NqLvGbL/C2.jpg', category: 'variation', command: 'Model seated in a thoughtful "thinker" pose, showing fabric drape.' },
            { id: 'C3', name: 'Pose 3', imageUrl: 'https://i.postimg.cc/W1g9dhmT/C3.jpg', category: 'angle', command: 'Dynamic striding profile with a look back towards the camera.' },
            { id: 'C4', name: 'Pose 4', imageUrl: 'https://i.postimg.cc/1zKJK2jx/C4.jpg', category: 'action', command: 'Casual side profile, leaning against a wall with hand in pocket.' },
            { id: 'C5', name: 'Pose 5', imageUrl: 'https://i.postimg.cc/xCx5wHY9/C5.jpg', category: 'variation', command: 'Model seated casually on a stool, hands clasped.' },
            { id: 'C6', name: 'Pose 6', imageUrl: 'https://i.postimg.cc/qMCwFz55/C6.jpg', category: 'angle', command: '3/4 view from the back, looking over the shoulder, showing shoulder fit.' },
            { id: 'C7', name: 'Pose 7', imageUrl: 'https://i.postimg.cc/RZ7RM29d/C7.jpg', category: 'angle', command: '3/4 back view, looking over the shoulder.' },
            { id: 'C8', name: 'Pose 8', imageUrl: 'https://i.postimg.cc/tgDN6PsW/C8.jpg', category: 'action', command: 'Confident 3/4 profile stance with both hands in pockets.' },
            { id: 'C9', name: 'Pose 9', imageUrl: 'https://i.postimg.cc/Y9sNnHfB/C9.jpg', category: 'angle', command: 'Direct rear view, highlighting the back details of the garment.' },
        ]
    }
];

const FEMALE_MODELS: Model[] = [
    {
        id: 'F_A_new',
        gender: 'Female',
        label: 'Model 1',
        fullBodyUrl: 'https://i.postimg.cc/yN7wgytj/A-main.jpg',
        closeUpUrl: 'https://i.postimg.cc/2ypp6NDG/A-main-closeup.jpg',
        poses: [
            { id: 'FA1', name: 'Pose 1', imageUrl: 'https://i.postimg.cc/fRNPjcRH/A1.jpg', category: 'angle', command: 'Side profile wall lean with a hand in pocket, showcasing the garment\'s silhouette.' },
            { id: 'FA2', name: 'Pose 2', imageUrl: 'https://i.postimg.cc/mk9d7kxq/A2.jpg', category: 'action', command: 'Confident front-facing symmetrical stance, full body view.' },
            { id: 'FA3', name: 'Pose 3', imageUrl: 'https://i.postimg.cc/5NcKbBLt/A3.jpg', category: 'action', command: 'Relaxed three-quarter profile stance with a single hand in the pocket.' },
            { id: 'FA4', name: 'Pose 4', imageUrl: 'https://i.postimg.cc/Pqq222s1/A4.jpg', category: 'variation', command: 'Close-up shot, leaning on a prop with a forward angle, focusing on texture.' },
            { id: 'FA5', name: 'Pose 5', imageUrl: 'https://i.postimg.cc/CM8JPRtJ/A5.jpg', category: 'angle', command: 'Three-quarter back stance with hands on hips or in pockets, showing back details.' },
            { id: 'FA6', name: 'Pose 6', imageUrl: 'https://i.postimg.cc/XYj8YQv8/A6.jpg', category: 'action', command: 'Casual stance with both hands in pockets and a slight forward lean.' },
            { id: 'FA7', name: 'Pose 7', imageUrl: 'https://i.postimg.cc/133GQXCm/A7.jpg', category: 'angle', command: 'Three-quarter back view, looking over the shoulder.' },
            { id: 'FA8', name: 'Pose 8', imageUrl: 'https://i.postimg.cc/j2TfkSwk/A8.jpg', category: 'angle', command: 'Confident three-quarter back stance with a hand on the hip.' },
            { id: 'FA9', name: 'Pose 9', imageUrl: 'https://i.postimg.cc/Cx5q2t1t/A9.jpg', category: 'action', command: 'Three-quarter profile with a hand gently touching the chest or collarbone.' },
            { id: 'FA10', name: 'Pose 10', imageUrl: 'https://i.postimg.cc/FR5k7HZk/A10.jpg', category: 'variation', command: 'Model seated in side profile, leaning with a contemplative downward gaze.' },
            { id: 'FA11', name: 'Pose 11', imageUrl: 'https://i.postimg.cc/8cw7KBVz/A11.jpg', category: 'action', command: 'Standing and leaning on a prop with a distinct hip-shift for a dynamic pose.' },
            { id: 'FA12', name: 'Pose 12', imageUrl: 'https://i.postimg.cc/RVs3wRRk/A12.jpg', category: 'action', command: 'Three-quarter forward view with a hand placed on the chest.' },
            { id: 'FA13', name: 'Pose 13', imageUrl: 'https://i.postimg.cc/sXr130jv/A13.jpg', category: 'action', command: 'Confident front-facing stance with both arms and legs crossed.' },
            { id: 'FA14', name: 'Pose 14', imageUrl: 'https://i.postimg.cc/MKFTnG6h/A14.jpg', category: 'angle', command: 'Full back view with the head turned to the side, showcasing back details.' },
            { id: 'FA15', name: 'Pose 15', imageUrl: 'https://i.postimg.cc/1tsRknBN/A15.jpg', category: 'action', command: 'Front-facing shot with a contemplative gaze and a slight downward head tilt.' },
            { id: 'FA16', name: 'Pose 16', imageUrl: 'https://i.postimg.cc/8P9p1nwV/A16.jpg', category: 'action', command: 'Symmetrical front-facing stance with the model looking down.' },
        ]
    },
    {
        id: 'F_B_new',
        gender: 'Female',
        label: 'Model 2',
        fullBodyUrl: 'https://i.postimg.cc/1t5JPW21/B-main.jpg',
        closeUpUrl: 'https://i.postimg.cc/yNPCvb0B/B-main-closeup.jpg',
        poses: [
            { id: 'FB1', name: 'Pose 1', imageUrl: 'https://i.postimg.cc/15kSxV58/B1.jpg', category: 'action', command: 'A confident, strong front-facing stance, full body.' },
            { id: 'FB2', name: 'Pose 2', imageUrl: 'https://i.postimg.cc/0QyRGpZL/B2.jpg', category: 'action', command: 'A relaxed but powerful front-facing stance.' },
            { id: 'FB3', name: 'Pose 3', imageUrl: 'https://i.postimg.cc/J4kwQ739/B3.jpg', category: 'angle', command: 'Side profile, leaning against a wall with a hand in the pocket.' },
            { id: 'FB4', name: 'Pose 4', imageUrl: 'https://i.postimg.cc/SKmwq60x/B4.jpg', category: 'angle', command: 'Three-quarter back view, looking back over the shoulder.' },
            { id: 'FB5', name: 'Pose 5', imageUrl: 'https://i.postimg.cc/C5n2JJ88/B5.jpg', category: 'action', command: 'An authoritative front-facing stance, full body.' },
            { id: 'FB6', name: 'Pose 6', imageUrl: 'https://i.postimg.cc/SNCSxfPJ/B6.jpg', category: 'angle', command: 'Full back view with the head turned to the side.' },
            { id: 'FB7', name: 'Pose 7', imageUrl: 'https://i.postimg.cc/85xG17Bt/B7.jpg', category: 'action', command: 'Three-quarter forward stance with a hand confidently on the hip.' },
            { id: 'FB8', name: 'Pose 8', imageUrl: 'https://i.postimg.cc/FFJmTxh4/B8.jpg', category: 'action', command: 'Standing and leaning on a prop with both hands in pockets.' },
            { id: 'FB9', name: 'Pose 9', imageUrl: 'https://i.postimg.cc/pLPHXb8G/B9.jpg', category: 'variation', command: 'Seated in profile with a forward lean and a downward gaze.' },
            { id: 'FB10', name: 'Pose 10', imageUrl: 'https://i.postimg.cc/cJHGwRDW/B10.jpg', category: 'action', command: 'A contemplative and thoughtful front-facing stance.' },
            { id: 'FB11', name: 'Pose 11', imageUrl: 'https://i.postimg.cc/L4fKt63x/B11.jpg', category: 'action', command: 'A contemplative front-facing stance with a downward gaze.' },
            { id: 'FB12', name: 'Pose 12', imageUrl: 'https://i.postimg.cc/Mp6CJ0J8/B12.jpg', category: 'action', command: 'A powerful front-facing stance with a hand on the hip.' },
            { id: 'FB13', name: 'Pose 13', imageUrl: 'https://i.postimg.cc/nL5gm6jh/B13.jpg', category: 'angle', command: 'Three-quarter back view, looking back towards the camera.' },
        ]
    },
    {
        id: 'F_C_new',
        gender: 'Female',
        label: 'Model 3',
        fullBodyUrl: 'https://i.postimg.cc/prVNwYY5/C-main.jpg',
        closeUpUrl: 'https://i.postimg.cc/zDx4LhFT/C-main-closeup.jpg',
        poses: [
            { id: 'FC1', name: 'Pose 1', imageUrl: 'https://i.postimg.cc/Twg7Dhvs/C1.jpg', category: 'action', command: 'Symmetrical front-facing stance with hands clasped or folded.' },
            { id: 'FC2', name: 'Pose 2', imageUrl: 'https://i.postimg.cc/yxTLL5dv/C2.jpg', category: 'angle', command: 'Side profile, leaning against a wall with both hands in pockets.' },
            { id: 'FC3', name: 'Pose 3', imageUrl: 'https://i.postimg.cc/Hkn6t6CL/C3.jpg', category: 'action', command: 'Confident front-facing stance with both arms and legs crossed.' },
            { id: 'FC4', name: 'Pose 4', imageUrl: 'https://i.postimg.cc/C1TJSYn8/C4.jpg', category: 'action', command: 'Dynamic striding pose in side profile with hands in pockets.' },
            { id: 'FC5', name: 'Pose 5', imageUrl: 'https://i.postimg.cc/BbJgPggx/C5.jpg', category: 'angle', command: 'Side profile with arms in a contemplative self-embrace.' },
            { id: 'FC6', name: 'Pose 6', imageUrl: 'https://i.postimg.cc/zXX7Jxv4/C6.jpg', category: 'angle', command: 'Three-quarter back view, looking over the shoulder.' },
            { id: 'FC7', name: 'Pose 7', imageUrl: 'https://i.postimg.cc/LsfBy7Qn/C7.jpg', category: 'action', command: 'Confident front-facing stance with arms crossed.' },
            { id: 'FC8', name: 'Pose 8', imageUrl: 'https://i.postimg.cc/nrV4hLFH/C8.jpg', category: 'angle', command: 'Full back view with the head turned to show a profile gaze.' },
            { id: 'FC9', name: 'Pose 9', imageUrl: 'https://i.postimg.cc/T2QjHn0g/C9.jpg', category: 'action', command: 'Three-quarter profile with a hand placed gently on the chest.' },
            { id: 'FC10', name: 'Pose 10', imageUrl: 'https://i.postimg.cc/rFP1qcvC/C10.jpg', category: 'action', command: 'Symmetrical front-facing stance with the model looking down.' },
            { id: 'FC11', name: 'Pose 11', imageUrl: 'https://i.postimg.cc/cJQw7366/C11.jpg', category: 'variation', command: 'Seated in side profile with a downward gaze, leaning on a prop.' },
            { id: 'FC12', name: 'Pose 12', imageUrl: 'https://i.postimg.cc/LXDPwMtp/C12.jpg', category: 'angle', command: 'Side profile, leaning on a prop with a downward gaze.' },
        ]
    }
];

export const ALL_MODELS: Model[] = [...MALE_MODELS, ...FEMALE_MODELS];