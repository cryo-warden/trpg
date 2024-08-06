import { defineComponent, Types } from "bitecs";
import { toMappedComponent } from "../../src";

const activitiesList = [
  "NULL",
  "Wake Up",
  "Brush Teeth",
  "Put On Left Sock",
  "Put On Right Sock",
  "Examine Worrisome Growth",
  "Refuse To Contemplate Mortality",
  "Remove Left Sock",
  "Remove Right Sock",
];

export const mapActivities = (activities: number[]) =>
  activities.map((v) => activitiesList[v]);

export const demapActivities = (activities: string[]) =>
  activities.map((v) => activitiesList.indexOf(v));

export type ActivityQueueData = {
  activities: string[];
};

export const ActivityQueue = () =>
  toMappedComponent(
    defineComponent({
      activities: [Types.ui8, 4],
    }),
    {
      map: (value): ActivityQueueData => {
        return {
          ...value,
          activities: mapActivities(value.activities),
        };
      },
      demap: (value: ActivityQueueData) => {
        return {
          ...value,
          activities: demapActivities(value.activities),
        };
      },
    }
  );
