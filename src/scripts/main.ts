import { initNavigation } from './navigation';
import { initBlog } from './blog';
import { initFooter } from './footer';
import { initOrigin } from './origin';
import { initMedia } from './media';
import { boot } from './boot';
import { initPrivacy } from './privacy';

let blog: ReturnType<typeof initBlog>;
const navigation = initNavigation(() => blog?.maybeLoadPosts());
blog = initBlog(navigation.isPosts, navigation.sizeHost);
const footer = initFooter(),
  origin = initOrigin(),
  media = initMedia(footer, origin);
const privacy = initPrivacy();
navigation.sizeHost();
boot(
  () => {
    navigation.sizeHost();
    footer.scheduleFooterLayout();
  },
  () => {
    origin.showOriginNotice();
    privacy.showNotice();
  },
  media.play,
  media.refreshMedia,
);
