import { weightedChoice, randChoice } from '../core/random.js';
import { TOPIC_HIERARCHY } from '../../config/constants.js';

export function selectTopic(topicWeights) {
  const topic = weightedChoice(topicWeights);
  const sub_topic = randChoice(TOPIC_HIERARCHY[topic]);
  return { topic, sub_topic };
}