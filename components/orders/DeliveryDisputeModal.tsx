import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  TextInput,
  ScrollView,
  TouchableWithoutFeedback,
} from "react-native";
import { Star } from "lucide-react-native";

const FEEDBACK_TAGS = {
  provider: {
    positive: [
      "Produit conforme",
      "Prix correct",
      "Bonne communication",
      "Service professionnel",
      "Accueil agréable",
    ],
    negative: [
      "Colis endommagé",
      "Erreur dans la commande",
    //  "Retard de livraison",
      "Je n'ai pas reçu ma commande"
      //"Prix exagéré",
      //"Communication difficile",
      //"Accueil médiocre",
    ],
  },
  courier: {
    positive: [
      "Livraison rapide",
      "Sympathique",
      "Ponctuel",
      "Professionnel",
      "Communication fluide",
    ],
    negative: [
      "Retard de livraison",
      "Impoli",
      "Colis endommagé",
      "Difficulté de communication",
      "Prix de livraison abusif",
    ],
  },
};

function StarRating({ rating, setRating }: any) {
  return (
    <View className="flex-row my-2 ">
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable key={i} onPress={() => setRating(i)}>
          <Star
            size={26}
            fill={i <= rating ? "#FFB800" : "transparent"}
            color="#FFB800"
            className="mx-1"
          />
        </Pressable>
      ))}
    </View>
  );
}

export function DeliveryDisputeModal({
  visible,
  onClose,
  onSubmit,
}: any) {
  const [tab, setTab] = useState<"provider" | "courier">("provider");

  const [feedback, setFeedback] = useState({
    provider: { rating: 1, tags: [] as string[], comment: "" },
    courier: { rating: 0, tags: [] as string[], comment: "" },
  });

  const toggleTag = (role: "provider" | "courier", tag: string) => {
    setFeedback((prev) => {
      const tags = prev[role].tags.includes(tag)
        ? prev[role].tags.filter((t) => t !== tag)
        : [...prev[role].tags, tag];
      return { ...prev, [role]: { ...prev[role], tags } };
    });
  };

  const handleChangeComment = (role: any, comment: string) => {
    setFeedback((prev) => ({
      ...prev,
      [role]: { ...prev[role], comment },
    }));
  };

  const data = feedback[tab];
  const sentiment = "negative" //data.rating >= 4 ? "positive" : "negative";

  const feedbackIsEmpty =
    feedback.provider.rating === 0 &&
    feedback.provider.comment.length < 3 //&&
   // feedback.courier.rating === 0 &&
   // feedback.courier.comment.length < 3;

  const submit = () => {
    if (!feedbackIsEmpty) {
      onSubmit(feedback);
      onClose();
      setFeedback({
        provider: { rating: 1, tags: [], comment: "" },
        courier: { rating: 0, tags: [], comment: "" },
      });
    }
  };

  const TAGS = FEEDBACK_TAGS[tab][sentiment];

  return (
    <Modal visible={visible} animationType="slide" transparent
    navigationBarTranslucent={true} statusBarTranslucent={false}
    onRequestClose={onClose}
    allowSwipeDismissal={true}
    onDismiss={onClose}
    onBlur={onClose}
    >
      <TouchableWithoutFeedback >
        <View className="flex-1 justify-end bg-black/40">
          <TouchableWithoutFeedback>
        <View className="rounded-t-3xl p-5 bg-white max-h-[85%]" style={{paddingBottom:50}}>
          <View className="items-center">
            <View className="w-10 h-1 bg-neutral-300 rounded-full mb-4" />
          </View>
          {/* TITLE */}
          <Text className="text-xl font-bold text-neutral-900 mb-1">
            Réclamation
          </Text>
          <Text className="text-neutral-500 mb-4">
            Quel est le sujet de votre plainte
          </Text>

          {/* TAGS */}
            <View className="flex-row flex-wrap gap-2 mb-4">
              {TAGS.map((t) => (
                <Pressable
                  key={t}
                  onPress={() => toggleTag(tab, t)}
                  className={`px-3 py-1 rounded-xl border ${
                    data.tags.includes(t)
                      ? "bg-[#7B3FE4] border-[#7B3FE4]"
                      : "border-neutral-300"
                  }`}
                >
                  <Text
                    className={`text-sm ${
                      data.tags.includes(t)
                        ? "text-white"
                        : "text-neutral-700"
                    }`}
                  >
                    {t}
                  </Text>
                </Pressable>
              ))}
            </View>

          {/* COMMENT */}
          <TextInput
            placeholder={`Dites nous en un peu plus...`}
            className="border border-neutral-300 rounded-xl p-3 h-24 mb-2"
            multiline
            value={data.comment}
            onChangeText={(txt) => handleChangeComment(tab, txt)}
            maxLength={300}
          />
          <Text className="text-right text-neutral-400 text-xs mb-4">
            {data.comment.length}/300
          </Text>

          {/* SUBMIT */}
          <Pressable
            disabled={feedbackIsEmpty}
            onPress={submit}
            className={`rounded-2xl py-3 w-full ${
              feedbackIsEmpty ? "bg-neutral-300" : "bg-[#7B3FE4]"
            }`}
          >
            <Text
              className={`text-center font-semibold ${
                feedbackIsEmpty ? "text-neutral-500" : "text-white"
              }`}
            >
              Valider
            </Text>
          </Pressable>

          <Pressable onPress={onClose} className="items-center mt-3">
            <Text className="text-neutral-500">Annuler</Text>
          </Pressable>
        </View>
        </TouchableWithoutFeedback>
      </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}
