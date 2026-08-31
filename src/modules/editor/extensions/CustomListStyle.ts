import { Extension } from "@tiptap/core";
import { BULLET_STYLES } from "../../../utils/listEngine";

export const CustomListStyle = Extension.create({
  name: "customListStyle",

  addGlobalAttributes() {
    return [
      {
        types: ["bulletList", "orderedList"],
        attributes: {
          listStyle: {
            default: null,
            parseHTML: (element) => {
              return (
                element.getAttribute("data-list-style") ||
                element.getAttribute("data-bullet-symbol") ||
                element.getAttribute("data-bullet-icon") ||
                null
              );
            },
            renderHTML: (attributes) => {
              if (!attributes.listStyle) {
                return {};
              }
              const val = attributes.listStyle;
              // Check if bullet glyph matches
              const matchedBullet = BULLET_STYLES.find(
                (b) => b.id === val || b.glyph === val
              );
              const glyph = matchedBullet ? matchedBullet.glyph : val;
              const styleId = matchedBullet ? matchedBullet.id : val;

              return {
                "data-list-style": styleId,
                "style": `--list-style: '${glyph} ';`,
              };
            },
          },
        },
      },
    ];
  },
});
